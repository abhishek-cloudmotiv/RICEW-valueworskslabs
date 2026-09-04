import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, Box, Typography, Select, MenuItem, FormControl } from '@mui/material';
import { Plus, Edit, Trash2, Save, X, MoreVertical, Download, Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import SessionExpiredPopup from './SessionExpiredPopup';

const LegalEntityMasterTable = ({ onClose, selectedProject, onBackToLanding, onLogout, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError, userId } = useSession();
  const { getCachedToken } = useAuth();
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id) {
      setShowNoProjectSelectedPopup(true);
    }
  }, [selectedProject?.id]);

  const [data, setData] = useState([]);

  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasNewRow, setHasNewRow] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const [countryOptions, setCountryOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);

  const showConfirmation = useCallback((message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmYes = () => {
    const action = confirmAction;
    // Close dialog first
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setConfirmMessage('');

    // Execute action after dialog closes
    if (action) {
      setTimeout(() => {
        action();
      }, 0);
    }
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
    loadLegalEntities();
    loadCountryOptions();
    loadRegionOptions();
  }, []);

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

  const loadLegalEntities = async () => {
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

      const projectId = selectedProject?.id;
      const response = await fetch(`https://98seg7o9z3.execute-api.ap-south-1.amazonaws.com/new/rice/get/legalEntityMasterByProject?projectId=${projectId}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        const records = Array.isArray(result) ? result : (result.data || []);

        if (records.length > 0) {
          // Filter out deleted records (deleteStatus = "true")
          const activeRecords = records.filter(item => item.deleteStatus !== "true");

          if (activeRecords.length > 0) {
            // Transform API data to match frontend structure
            const transformedData = activeRecords.map((item, index) => ({
              id: index + 1,
              legalEntityId: item.legalEntityId || '', // User-entered Legal Entity ID
              legalEntityMasterId: item.legal_Entity_Master_id || '', // Database primary key
              legalEntityCode: item.legalEntityCode || '',
              legalEntityName: item.legalEntityName || '',
              businessUnitCode: item.businessUnitCode || '',
              businessUnitName: item.business_Unit_Name || '', // Map from API snake_case to camelCase
              globalRegion: item.global_Region || '', // Map from API snake_case to camelCase
              country: item.country || '',
              createdBy: item.createdBy || '',
              lastUpdatedDate: item.lastUpdatedDate ? item.lastUpdatedDate.split('T')[0] : '',
              comments: item.comments || '',
              isSaved: true // Mark as saved since it came from backend
            }));

            // Sort saved data by legal_Entity_Master_id ascending (higher IDs at bottom)
            const sortedData = transformedData.sort((a, b) => {
              const idA = parseInt(a.legalEntityMasterId || '0');
              const idB = parseInt(b.legalEntityMasterId || '0');
              return idA - idB; // Lower IDs first, higher IDs last (at bottom)
            });

            setData(sortedData);
          } else {
            // If all records are deleted, show empty state
            setData([]);
          }
        }
      } else {
        setErrorMessage('Failed to load legal entities. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      handleAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCountryOptions = async () => {
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

      const projectId = selectedProject?.id;
      const url = `https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/activeCountries?project_id=${projectId}`;

      const response = await fetch(url, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        const countriesArray = result.data || [];

        if (countriesArray.length > 0) {
          // The backend already unmarshals and filters for active countries
          const transformedCountries = countriesArray.map(item => ({
            list_Of_Countrie_id: item.list_Of_Countrie_id || '',
            Code: item.Code || '',
            Country_Name: item.Country_Name || item['Country/Region'] || '',
            GEOCODE: item.GEOCODE || '',
            Active: item.Active || ''
          }));

          // Sort by Country_Name
          transformedCountries.sort((a, b) => {
            const nameA = a.Country_Name || '';
            const nameB = b.Country_Name || '';
            return nameA.localeCompare(nameB);
          });

          setCountryOptions(transformedCountries);
        } else {
          setCountryOptions([]);
        }
      } else {
        console.error('Failed to load country options:', response.statusText);
        setCountryOptions([]);
      }
    } catch (error) {
      console.error('Error loading country options:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('No internet connection - country options unavailable');
      }
      setCountryOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRegionOptions = async () => {
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

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/listOfGeography', {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }
      if (response.ok) {
        const result = await response.json();

        const regionsArray = Array.isArray(result) ? result : (result.data || []);

        if (regionsArray.length > 0) {
          // Transform geography data to handle both DynamoDB and plain object formats
          const transformedRegions = regionsArray.map(item => ({
            list_Of_Geography_id: item.list_Of_Geography_id?.S || item.list_Of_Geography_id || '',
            geoCode: item.geoCode?.S || item.geoCode || '',
            description: item.description?.S || item.description || ''
          }));

          // Sort by geoCode for consistent ordering
          const sortedRegions = transformedRegions.sort((a, b) => {
            const codeA = a.geoCode || '';
            const codeB = b.geoCode || '';
            return codeA.localeCompare(codeB);
          });

          setRegionOptions(sortedRegions);
        } else {
          setRegionOptions([]);
        }
      } else {
        console.error('Failed to load region options:', response.statusText);
        setRegionOptions([]);
      }
    } catch (error) {
      console.error('Error loading region options:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('No internet connection - region options unavailable');
      }
      setRegionOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const newRowRef = useRef(null);

  const addNewRow = async () => {
    const hasEditingItem = editingItem !== null;
    const hasUnsavedRow = data.some(row => !row.isSaved);

    // Clear all Required error messages when button is clicked
    setFieldErrors({});

    // If currently editing a record, show confirmation dialog
    if (hasEditingItem && !hasUnsavedRow) {
      showConfirmation(
        'You have unsaved changes. Do you want to continue?',
        () => {
          // User clicked Yes - cancel the edit and add a new row
          setEditingItem(null);
          setEditValues({});
          setFieldErrors({});

          // Auto-select Country and Global Region if only 1 country is available
          let autoCountry = '';
          let autoRegion = '';

          if (countryOptions && countryOptions.length === 1) {
            const singleCountry = countryOptions[0];
            autoCountry = singleCountry.Country_Name || '';
            autoRegion = singleCountry.GEOCODE || singleCountry.global_region || '';
          }

          // Add a new empty row
          const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
          setData([...data, {
            id: newId,
            legalEntityId: '',
            legalEntityMasterId: '',
            legalEntityCode: '',
            legalEntityName: '',
            businessUnitCode: '',
            businessUnitName: '',
            globalRegion: autoRegion,
            country: autoCountry,
            createdBy: '',
            lastUpdatedDate: new Date().toISOString().split('T')[0],
            comments: '',
            isSaved: false
          }]);
          setHasNewRow(true);

          setTimeout(() => {
            const scrollContainer = document.querySelector('.MuiTableContainer-root');
            if (scrollContainer && newRowRef.current) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
          }, 100);
        }
      );
      return;
    }

    if (hasEditingItem || hasUnsavedRow) {
      // ... existing code for handling saves
      let updatedCount = 0;
      let addedCount = 0;
      let editSaveSuccess = false;
      let newRowSaveSuccess = false;
      const unsavedRows = hasUnsavedRow ? data.filter(row => !row.isSaved) : [];

      // Save the editing item first (suppress individual message)
      if (hasEditingItem) {
        editSaveSuccess = await handleSaveEdit(editingItem, true);
        if (editSaveSuccess) updatedCount = 1;
      }

      // Save unsaved rows (suppress individual message)
      if (hasUnsavedRow) {
        newRowSaveSuccess = await handleSaveNewRow(true);
        if (newRowSaveSuccess) addedCount = unsavedRows.length;
      }

      // Build consolidated message and show ONLY ONE message
      let messageText = '';
      let isSuccess = false;

      // Check for validation errors in fieldErrors
      const hasEditErrors = fieldErrors.edit && Object.keys(fieldErrors.edit).length > 0;
      const hasNewRowErrors = Object.keys(fieldErrors).some(key => key !== 'edit' && fieldErrors[key] && Object.keys(fieldErrors[key]).length > 0);

      // Get count of unsaved rows with errors
      const newRowsWithErrors = Object.keys(fieldErrors).filter(key => key !== 'edit' && fieldErrors[key] && Object.keys(fieldErrors[key]).length > 0).length;

      // Case 1: Both operations succeeded
      if (editSaveSuccess && newRowSaveSuccess && addedCount > 0 && updatedCount > 0) {
        messageText = `${addedCount} Legal ${addedCount === 1 ? 'Entity' : 'Entities'} added and ${updatedCount} record updated successfully!`;
        isSuccess = true;
      }
      // Case 2: Only edit succeeded
      else if (editSaveSuccess && updatedCount > 0 && !newRowSaveSuccess) {
        // Check if new rows failed due to validation errors
        if (hasNewRowErrors) {
          messageText = `${updatedCount} record updated successfully! But ${newRowsWithErrors} new ${newRowsWithErrors === 1 ? 'record has' : 'records have'} missing required fields. Please fill in all required fields and try again.`;
        } else {
          messageText = `${updatedCount} record updated successfully! But ${unsavedRows.length} new ${unsavedRows.length === 1 ? 'record' : 'records'} failed. Please fix the errors and try again.`;
        }
        isSuccess = false;
      }
      // Case 3: Only new rows succeeded (no edit record was being edited)
      else if (newRowSaveSuccess && addedCount > 0 && !hasEditingItem) {
        messageText = `${addedCount} Legal ${addedCount === 1 ? 'Entity' : 'Entities'} added successfully!`;
        isSuccess = true;
      }
      // Case 3b: New rows succeeded but edit failed
      else if (newRowSaveSuccess && addedCount > 0 && hasEditingItem && !editSaveSuccess) {
        if (hasEditErrors) {
          messageText = `${addedCount} Legal ${addedCount === 1 ? 'Entity' : 'Entities'} added successfully! But 1 record has missing required fields. Please fill in all required fields and try again.`;
        } else {
          messageText = `${addedCount} Legal ${addedCount === 1 ? 'Entity' : 'Entities'} added successfully! But 1 record update failed. Please fix the errors and try again.`;
        }
        isSuccess = false;
      }
      // Case 4: Partial success - edit succeeded but new rows failed
      else if (editSaveSuccess && updatedCount > 0 && hasUnsavedRow && !newRowSaveSuccess) {
        if (hasNewRowErrors) {
          messageText = `${updatedCount} record updated successfully! But ${newRowsWithErrors} new ${newRowsWithErrors === 1 ? 'record has' : 'records have'} missing required fields. Please fill in all required fields and try again.`;
        } else {
          messageText = `${updatedCount} record updated successfully! But ${unsavedRows.length} new ${unsavedRows.length === 1 ? 'record' : 'records'} failed. Please fix the errors and try again.`;
        }
        isSuccess = false;
      }
      // Case 5: Only new rows succeeded but no edit was being edited - already handled in Case 3
      // Case 6: Only new rows failed (no edit was being edited)
      else if (hasUnsavedRow && !hasEditingItem && !newRowSaveSuccess) {
        messageText = hasNewRowErrors ? 'The required fields are missing' : 'Save failed. Please try again.';
        isSuccess = false;
      }
      // Case 7: Both failed
      else if (hasEditingItem && hasUnsavedRow && !editSaveSuccess && !newRowSaveSuccess) {
        if (hasEditErrors && hasNewRowErrors) {
          messageText = `1 record has missing required fields and ${newRowsWithErrors} new ${newRowsWithErrors === 1 ? 'record has' : 'records have'} missing required fields. Please fill in all required fields and try again.`;
        } else if (hasEditErrors) {
          messageText = `1 record has missing required fields and ${unsavedRows.length} new ${unsavedRows.length === 1 ? 'record' : 'records'} failed. Please fix the errors and try again.`;
        } else if (hasNewRowErrors) {
          messageText = `1 record update failed and ${newRowsWithErrors} new ${newRowsWithErrors === 1 ? 'record has' : 'records have'} missing required fields. Please fix the errors and try again.`;
        } else {
          messageText = `1 record update failed and ${unsavedRows.length} new ${unsavedRows.length === 1 ? 'record' : 'records'} failed. Please fix the errors and try again.`;
        }
        isSuccess = false;
      }

      // Show the consolidated message
      if (messageText) {
        if (isSuccess) {
          // Reset all field errors ONLY on complete success (both edit and new rows)
          setFieldErrors({});
          setSuccessMessage(messageText);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 4000);
        } else {
          // On failure or partial success, DO NOT reset fieldErrors - keep them visible
          // so users can see which fields need to be fixed
          setErrorMessage(messageText);
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 3000);
        }
      }
    } else {
      // Auto-select Country and Global Region if only 1 country is available
      let autoCountry = '';
      let autoRegion = '';

      if (countryOptions && countryOptions.length === 1) {
        const singleCountry = countryOptions[0];
        autoCountry = singleCountry.Country_Name || '';
        autoRegion = singleCountry.GEOCODE || singleCountry.global_region || '';
      }

      // Otherwise, add a new empty row
      const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
      setData([...data, {
        id: newId,
        legalEntityId: '',
        legalEntityMasterId: '', // Database primary key (empty for new records)
        legalEntityCode: '',
        legalEntityName: '',
        businessUnitCode: '',
        businessUnitName: '',
        globalRegion: autoRegion,
        country: autoCountry,
        createdBy: '',
        lastUpdatedDate: new Date().toISOString().split('T')[0], // Set to today's date
        comments: '',
        isSaved: false
      }]);
      setHasNewRow(true);

      setTimeout(() => {
        // Scroll within the table container only (vertical scroll)
        const scrollContainer = document.querySelector('.MuiTableContainer-root');
        if (scrollContainer && newRowRef.current) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 100);
    }
  };

  const updateRow = (index, field, value) => {
    // Convert to uppercase for CODE fields
    if (field === 'legalEntityCode' || field === 'businessUnitCode') {
      value = value.toUpperCase();
    }

    // Enforce character limit for comments field
    if (field === 'comments') {
      const maxLength = 240;
      if (value.length > maxLength) {
        value = value.substring(0, maxLength);
      }
      // Apply sentence case formatting for comments field (capitalize first character only)
      if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
      }
    }

    // Apply validation before updating
    if (field !== 'lastUpdatedDate' && !validateField(field, value)) {
      return; // Don't update if validation fails
    }

    const newData = [...data];
    newData[index][field] = value;

    // If global region changes, clear the country selection
    if (field === 'globalRegion') {
      newData[index].country = '';
    }

    setData(newData);
  };

  const removeRow = (index) => {
    if (data.length > 1) {
      setData(data.filter((_, i) => i !== index));
    }
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
            const todayDate = new Date().toISOString().split('T')[0];
            setEditValues({
              ...item,
              lastUpdatedDate: todayDate,
              legalEntityId: item.legalEntityId || '',
              legalEntityCode: item.legalEntityCode || '',
              legalEntityName: item.legalEntityName || '',
              businessUnitCode: item.businessUnitCode || '',
              businessUnitName: item.businessUnitName || '',
              globalRegion: item.globalRegion || '',
              country: item.country || '',
              comments: item.comments || ''
            });
          }
        );
      } else if (data.some(row => !row.isSaved)) {
        // Check if there's an unsaved new row
        showConfirmation(
          'You have unsaved changes. Do you want to continue?',
          () => {
            // User clicked Yes - discard the unsaved row and proceed with edit
            const savedData = data.filter(row => row.isSaved);
            setData(savedData);
            setHasNewRow(false);
            setFieldErrors({});

            // Now set the edit mode
            setEditingItem(id);
            const todayDate = new Date().toISOString().split('T')[0];
            setEditValues({
              ...item,
              lastUpdatedDate: todayDate,
              legalEntityId: item.legalEntityId || '',
              legalEntityCode: item.legalEntityCode || '',
              legalEntityName: item.legalEntityName || '',
              businessUnitCode: item.businessUnitCode || '',
              businessUnitName: item.businessUnitName || '',
              globalRegion: item.globalRegion || '',
              country: item.country || '',
              comments: item.comments || ''
            });
          }
        );
      } else {
        // No unsaved changes, proceed normally
        setEditingItem(id);
        const todayDate = new Date().toISOString().split('T')[0];
        setEditValues({
          ...item,
          lastUpdatedDate: todayDate,
          legalEntityId: item.legalEntityId || '',
          legalEntityCode: item.legalEntityCode || '',
          legalEntityName: item.legalEntityName || '',
          businessUnitCode: item.businessUnitCode || '',
          businessUnitName: item.businessUnitName || '',
          globalRegion: item.globalRegion || '',
          country: item.country || '',
          comments: item.comments || ''
        });
      }
    }
  };

  const handleSaveEdit = async (id, suppressMessage = false) => {
    // Validate required fields
    const errors = {};

    if (!editValues.legalEntityCode || editValues.legalEntityCode.trim() === '') {
      errors.legalEntityCode = 'Required';
    }
    if (!editValues.businessUnitCode || editValues.businessUnitCode.trim() === '') {
      errors.businessUnitCode = 'Required';
    }
    if (!editValues.legalEntityName || editValues.legalEntityName.trim() === '') {
      errors.legalEntityName = 'Required';
    }
    if (!editValues.businessUnitName || editValues.businessUnitName.trim() === '') {
      errors.businessUnitName = 'Required';
    }
    if (!editValues.globalRegion || editValues.globalRegion.trim() === '') {
      errors.globalRegion = 'Required';
    }
    if (!editValues.country || editValues.country.trim() === '') {
      errors.country = 'Required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors({ edit: errors });
      if (!suppressMessage) {
        setErrorMessage(Object.keys(errors).length > 1 ? 'The required fields are missing' : 'The required field is missing');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 3000);
      }
      return false;
    }

    setFieldErrors({});

    // Update editValues with today's date before sending to API
    const todayDate = new Date().toISOString().split('T')[0];
    const updatedEditValues = { ...editValues, lastUpdatedDate: todayDate };

    const success = await updateLegalEntity(updatedEditValues);
    if (success) {
      if (!suppressMessage) {
        setSuccessMessage('Legal Entity updated successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
      }

      // Update the local data immediately with today's date for Last Updated Date
      const updatedData = data.map(item =>
        item.id === id ? { ...item, lastUpdatedDate: todayDate } : item
      );
      setData(updatedData);

      // Reload data from API after successful update
      await loadLegalEntities();
      setEditingItem(null);
      setEditValues({});
    }
    return success;
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
    setFieldErrors({});
  };

  const deleteLegalEntity = async (legalEntityMasterId) => {
    setLoading(true);
    try {
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

      const projectId = selectedProject?.id;
      const response = await fetch(`https://98seg7o9z3.execute-api.ap-south-1.amazonaws.com/new/rice/delete/legalEntityMaster?legal_Entity_Master_id=${legalEntityMasterId}&projectId=${projectId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return false;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Legal Entity deleted successfully:', result);
        setSuccessMessage('Legal Entity deleted successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
        return true;
      } else {
        const errBody = await response.json().catch(() => ({}));
        const errMsg = errBody?.error || 'Failed to delete legal entity. Please try again.';
        console.error('Failed to delete legal entity:', response.status, errMsg);
        setErrorMessage(errMsg);
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Error deleting legal entity:', error);
      setErrorMessage('Error deleting legal entity. Please check your connection and try again.');
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

  const handleDelete = async (id) => {
    const rowToDelete = data.find(item => item.id === id);

    if (rowToDelete) {
      // Check if deleting an unsaved row
      if (!rowToDelete.isSaved) {
        // Only prevent deleting if it's the last row and it's unsaved
        if (data.length > 1) {
          setHasNewRow(false);
          const rowIndex = data.findIndex(item => item.id === id);

          // Clear field errors for this row
          if (fieldErrors[rowIndex]) {
            const newErrors = { ...fieldErrors };
            delete newErrors[rowIndex];
            setFieldErrors(newErrors);
          }

          setData(data.filter(item => item.id !== id));
        }
      } else {
        // For saved records, show confirmation
        showConfirmation('Are you sure you want to delete this legal entity?', async () => {
          const success = await deleteLegalEntity(rowToDelete.legalEntityMasterId);
          if (success) {
            // Reload data from API after successful delete
            await loadLegalEntities();
          }
        });
      }
    }
  };

  // Validation functions based on field specifications
  const validateField = (fieldName, value) => {
    const validations = {
      legalEntityId: { maxLength: 10, type: 'alphanumeric', noSpaces: true },
      legalEntityCode: { maxLength: 30, type: 'alphanumeric', noSpaces: true, uppercase: true },
      legalEntityName: { maxLength: 240, type: 'legalName' },
      businessUnitCode: { maxLength: 30, type: 'alphanumeric', noSpaces: true, uppercase: true },
      businessUnitName: { maxLength: 240, type: 'legalName' },
      globalRegion: { maxLength: 50, type: 'alphanumeric' },
      country: { maxLength: 50, type: 'legalName' },
      createdBy: { maxLength: 50, type: 'alphanumeric' },
      comments: { maxLength: 240, type: 'allChars' }
    };

    const validation = validations[fieldName];
    if (!validation) return true;

    // Check length
    if (value.length > validation.maxLength) return false;

    // Check for spaces if noSpaces is true
    if (validation.noSpaces && value.includes(' ')) return false;

    // Check alphanumeric (allows only letters, numbers, spaces, and hyphens - no other special characters)
    if (validation.type === 'alphanumeric') {
      const alphanumericRegex = /^[a-zA-Z0-9\\s\\-]*$/;
      return alphanumericRegex.test(value);
    }

    // Check legalName (allows letters, numbers, spaces, and special chars: & - . , ' ( ) /)
    if (validation.type === 'legalName') {
      const legalNameRegex = /^[a-zA-Z0-9\s&\-.,\'()\/]*$/;
      return legalNameRegex.test(value);
    }

    // Check allChars (allows all characters including special characters)
    if (validation.type === 'allChars') {
      return true; // Allow all characters for comments field
    }

    return true;
  };

  const getCharacterCount = (fieldName) => {
    const maxLengths = {
      legalEntityId: 10,
      legalEntityCode: 30,
      legalEntityName: 240,
      businessUnitCode: 30,
      businessUnitName: 240,
      globalRegion: 50,
      country: 50,
      createdBy: 50,
      comments: 240
    };
    return maxLengths[fieldName] || 0;
  };

  const saveLegalEntity = async (entityData) => {
    setLoading(true);
    try {
      const projectId = selectedProject?.id;
      const userIdValue = userId;

      const payload = {
        legalEntityId: entityData.legalEntityId || '',
        legalEntityCode: entityData.legalEntityCode,
        legalEntityName: entityData.legalEntityName,
        businessUnitCode: entityData.businessUnitCode,
        business_Unit_Name: entityData.businessUnitName,
        global_Region: entityData.globalRegion,
        country: entityData.country,
        projectId: projectId,
        createdBy: userIdValue,
        lastUpdatedDate: new Date().toISOString().split('T')[0], // Set to today's date
        comments: entityData.comments,
        user_id: userIdValue
      };

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getCachedToken();
        console.log('Token retrieved for save:', idToken ? 'Token exists' : 'No token');
      } catch (tokenError) {
        console.error('Failed to get ID token for saving legal entity:', tokenError);
        setErrorMessage('Authentication failed. Please log in again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }

      if (!idToken) {
        console.error('No ID token available for saving legal entity');
        setErrorMessage('Authentication required. Please log in again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      console.log('Making save request with headers:', { ...headers, Authorization: 'Bearer [REDACTED]' });

      const response = await fetch('https://98seg7o9z3.execute-api.ap-south-1.amazonaws.com/new/rice/save/legalEntityMaster', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Legal Entity saved successfully:', result);
        setHasNewRow(false);
        return true;
      } else {
        console.error('Failed to save legal entity:', response.statusText);
        setErrorMessage('Failed to save legal entity. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Error saving legal entity:', error);
      setErrorMessage('Error saving legal entity. Please check your connection and try again.');
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

  const updateLegalEntity = async (entityData) => {
    setLoading(true);
    // Ensure projectId and userId are strings
    const projectId = selectedProject?.id;
    const userIdValue = userId;

    try {
      const payload = {
        // Explicitly convert ID to string as backend validation expects it
        legal_Entity_Master_id: entityData.legalEntityMasterId ? entityData.legalEntityMasterId.toString() : "",
        legalEntityId: entityData.legalEntityId ? entityData.legalEntityId.toString() : "",
        legalEntityCode: entityData.legalEntityCode,
        legalEntityName: entityData.legalEntityName,
        businessUnitCode: entityData.businessUnitCode,
        business_Unit_Name: entityData.businessUnitName,
        global_Region: entityData.globalRegion,
        country: entityData.country,
        projectId: projectId,
        comments: entityData.comments || "",
        lastUpdatedDate: new Date().toISOString(), // Use ISO string to match backend 'now' format if needed
        updatedBy: userIdValue,
        user_id: userIdValue
      };

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getCachedToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for updating legal entity:', tokenError);
        setErrorMessage('Authentication failed. Please log in again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }

      if (!idToken) {
        setErrorMessage('Authentication required. Please log in again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch('https://98seg7o9z3.execute-api.ap-south-1.amazonaws.com/new/rice/update/legalEntityMaster', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Legal Entity updated successfully:', result);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to update legal entity:', response.status, response.statusText, errorData);

        // Use backend error message if available, otherwise fallback to default
        const errorMsg = errorData.error || errorData.message || 'Failed to update legal entity. Please try again.';
        setErrorMessage(errorMsg);

        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Error updating legal entity:', error);
      setErrorMessage('Error updating legal entity. Please check your connection and try again.');
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

  const handleSaveNewRow = async (suppressMessage = false) => {
    // Find all unsaved rows (uploaded data that hasn't been saved yet)
    const unsavedRows = data.filter(row => !row.isSaved);

    if (unsavedRows.length === 0) {
      setErrorMessage('No unsaved records found.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 3000);
      return false;
    }

    // Validate required fields and track errors per row
    const newFieldErrors = {};
    let hasErrors = false;

    unsavedRows.forEach((row, index) => {
      const rowIndex = data.findIndex(r => r.id === row.id);
      const errors = {};

      if (!row.legalEntityCode || row.legalEntityCode.trim() === '') {
        errors.legalEntityCode = 'Required';
        hasErrors = true;
      }
      if (!row.businessUnitCode || row.businessUnitCode.trim() === '') {
        errors.businessUnitCode = 'Required';
        hasErrors = true;
      }
      if (!row.legalEntityName || row.legalEntityName.trim() === '') {
        errors.legalEntityName = 'Required';
        hasErrors = true;
      }
      if (!row.businessUnitName || row.businessUnitName.trim() === '') {
        errors.businessUnitName = 'Required';
        hasErrors = true;
      }
      if (!row.globalRegion || row.globalRegion.trim() === '') {
        errors.globalRegion = 'Required';
        hasErrors = true;
      }
      if (!row.country || row.country.trim() === '') {
        errors.country = 'Required';
        hasErrors = true;
      }

      if (Object.keys(errors).length > 0) {
        newFieldErrors[rowIndex] = errors;
      }
    });

    if (hasErrors) {
      setFieldErrors(newFieldErrors);
      if (!suppressMessage) {
        // Count total missing fields across all rows
        const totalMissingFields = Object.values(newFieldErrors).reduce((total, rowErrors) => {
          return total + Object.keys(rowErrors).length;
        }, 0);

        setErrorMessage(totalMissingFields > 1 ? 'The required fields are missing' : 'The required field is missing');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 3000);
      }
      return false;
    }

    // Clear field errors if validation passes
    setFieldErrors({});

    const projectId = selectedProject?.id;
    const userIdValue = userId;

    // Prepare all records for bulk save
    const recordsToSave = unsavedRows.map(row => ({
      legalEntityId: row.legalEntityId || '',
      legalEntityCode: row.legalEntityCode,
      legalEntityName: row.legalEntityName,
      businessUnitCode: row.businessUnitCode,
      business_Unit_Name: row.businessUnitName,
      global_Region: row.globalRegion,
      country: row.country,
      projectId: projectId,
      createdBy: userId,
      lastUpdatedDate: new Date().toISOString().split('T')[0],
      comments: row.comments,
      user_id: userIdValue
    }));

    setLoading(true);
    try {
      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getCachedToken();
        console.log('Token retrieved for bulk save:', idToken ? 'Token exists' : 'No token');
      } catch (tokenError) {
        console.error('Failed to get ID token for bulk saving legal entities:', tokenError);
        setErrorMessage('Authentication failed. Please log in again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        setLoading(false);
        return false;
      }

      if (!idToken) {
        console.error('No ID token available for bulk saving legal entities');
        setErrorMessage('Authentication required. Please log in again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        setLoading(false);
        return false;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      console.log('Making bulk save request with headers:', { ...headers, Authorization: 'Bearer [REDACTED]' });

      // Send all records in a single API call (backend supports arrays)
      const response = await fetch('https://98seg7o9z3.execute-api.ap-south-1.amazonaws.com/new/rice/save/legalEntityMaster', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(recordsToSave) // Send array of records
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`${unsavedRows.length} Legal Entities saved successfully:`, result);

        // Mark all saved rows as saved and update their IDs if needed
        const updatedData = data.map(row => {
          if (!row.isSaved) {
            return { ...row, isSaved: true };
          }
          return row;
        });

        setData(updatedData);
        setHasNewRow(false);

        if (!suppressMessage) {
          setSuccessMessage(`${unsavedRows.length} Legal ${unsavedRows.length === 1 ? 'Entity' : 'Entities'} saved successfully!`);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);
        }

        // Reload data from API to get the generated IDs
        await loadLegalEntities();
        return true;
      } else {
        console.error('Failed to save legal entities:', response.statusText);
        if (!suppressMessage) {
          setErrorMessage('Failed to save legal entities. Please try again.');
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
        }
        return false;
      }
    } catch (error) {
      console.error('Error saving legal entities:', error);
      if (!suppressMessage) {
        setErrorMessage('Error saving legal entities. Please check your connection and try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Define the headers for the XLSX template (including Business Unit Name)
    const headers = [
      'Legal Entity Code',
      'Legal Entity Name',
      'Business Unit Code',
      'Business Unit Name',
      'Global Region',
      'Country',
      'Comments / Notes'
    ];

    // Create a worksheet with headers only
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Create a workbook and add the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LegalEntityMaster');

    // Generate the XLSX file and trigger download
    XLSX.writeFile(wb, 'LegalEntityMaster_Template.xlsx');
  };

  const handleUploadLegalEntity = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is XLSX
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage('Please select a valid Excel file (.xlsx or .xls)');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    setUploading(true);
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          setErrorMessage('The uploaded file appears to be empty or invalid.');
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
          setUploading(false);
          return;
        }

        // Skip header row and process data
        const rows = jsonData.slice(1);
        const uploadedRows = [];
        let errorCount = 0;

        for (const row of rows) {
          // Skip empty rows
          if (!row || row.every(cell => !cell)) continue;

          const [
            legalEntityCode,
            legalEntityName,
            businessUnitCode,
            businessUnitName,
            globalRegion,
            country,
            comments
          ] = row;

          // Validate required fields (Legal Entity ID not required for template uploads)
          if (!legalEntityCode || legalEntityCode.toString().trim() === '' ||
            !legalEntityName || legalEntityName.toString().trim() === '' ||
            !country || country.toString().trim() === '') {
            console.error('Skipping row - missing required fields:', row);
            errorCount++;
            continue;
          }

          // Check for spaces in CODE fields and convert to uppercase
          const legalEntityCodeStr = legalEntityCode.toString().toUpperCase();
          const businessUnitCodeStr = businessUnitCode ? businessUnitCode.toString().toUpperCase() : '';

          if (legalEntityCodeStr.includes(' ')) {
            console.error('Skipping row - Legal Entity CODE cannot contain spaces:', legalEntityCodeStr);
            errorCount++;
            continue;
          }

          if (businessUnitCodeStr.includes(' ')) {
            console.error('Skipping row - Business Unit CODE cannot contain spaces:', businessUnitCodeStr);
            errorCount++;
            continue;
          }

          // Prepare data for table (not for API save yet)
          const tableRow = {
            id: Date.now() + Math.random(), // Unique ID for table
            legalEntityId: '', // Will be generated when saved
            legalEntityMasterId: '', // Database primary key (empty for new records)
            legalEntityCode: legalEntityCodeStr,
            legalEntityName: legalEntityName.toString(),
            businessUnitCode: businessUnitCodeStr,
            businessUnitName: businessUnitName ? businessUnitName.toString() : '',
            globalRegion: globalRegion ? globalRegion.toString() : '',
            country: country.toString(),
            createdBy: '',
            lastUpdatedDate: new Date().toISOString().split('T')[0],
            comments: comments ? comments.toString() : '',
            isSaved: false // Mark as not saved - user needs to save each row individually
          };

          // Validate field lengths
          const isValid = validateField('legalEntityId', tableRow.legalEntityId) &&
            validateField('legalEntityCode', tableRow.legalEntityCode) &&
            validateField('legalEntityName', tableRow.legalEntityName) &&
            validateField('businessUnitCode', tableRow.businessUnitCode) &&
            validateField('businessUnitName', tableRow.businessUnitName) &&
            validateField('globalRegion', tableRow.globalRegion) &&
            validateField('country', tableRow.country) &&
            validateField('comments', tableRow.comments);

          if (!isValid) {
            console.error('Skipping row - validation failed:', tableRow);
            errorCount++;
            continue;
          }

          uploadedRows.push(tableRow);
        }

        // Add the uploaded rows to the existing data
        if (uploadedRows.length > 0) {
          setData(prevData => [...prevData, ...uploadedRows]);
          setSuccessMessage(`Upload successful! ${uploadedRows.length} rows loaded into the table.${errorCount > 0 ? ` ${errorCount} rows were skipped (missing required fields, spaces in CODE fields, or validation errors).` : ''}\n\nPlease review the data and save each row individually using the "Save Record" button.`);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 5000);
        } else {
          setErrorMessage(`Upload failed. No valid records were found in the file. ${errorCount > 0 ? `${errorCount} rows were skipped due to validation errors (missing required fields, spaces in CODE fields, or other validation issues).` : ''}`);
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
        }

        setUploading(false);

        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setErrorMessage('Error processing the uploaded file. Please check the file format.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      setUploading(false);
      setLoading(false);
    }
  };

  const getFilteredCountryOptions = (selectedRegion) => {
    if (!selectedRegion) {
      return countryOptions;
    }
    return countryOptions.filter(country => country.GEOCODE === selectedRegion);
  };

  const handleInputChange = (field, value) => {
    // Enforce character limit for comments field
    if (field === 'comments') {
      const maxLength = 240;
      if (value.length > maxLength) {
        value = value.substring(0, maxLength);
      }
      // Apply sentence case formatting for comments field (capitalize first character only)
      if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
      }
    }

    setEditValues(prev => {
      const newValues = { ...prev, [field]: value };

      // If global region changes, clear the country selection
      if (field === 'globalRegion') {
        newValues.country = '';
      }

      return newValues;
    });
  };

  const handleBackToLanding = useCallback(() => {
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
  }, [hasNewRow, editingItem, onBackToLanding, showConfirmation]);

  const handleLogout = useCallback(() => {
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
  }, [hasNewRow, editingItem, onLogout, showConfirmation]);

  const renderInputWithError = (inputComponent, error, charCount = null, isEditing = false, field = '', currentValue = '') => {
    const hasError = !!error;
    const errorHeight = 20; // Reserved height for error message

    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', minHeight: `${40 + (hasError ? 0 : errorHeight)}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {inputComponent}
          {charCount}
        </div>
        <div style={{ height: `${errorHeight}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
          {hasError && (
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to handle paste with character limit trimming
  const handlePasteWithLimit = (e, field, currentValue, isEditing = false, index = null) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const maxLength = getCharacterCount(field);

    // Get the current value based on editing mode
    let currentText = '';
    if (isEditing) {
      currentText = currentValue || '';
    } else if (index !== null) {
      currentText = data[index][field] || '';
    }

    // Calculate how much text we can add
    const remainingChars = maxLength - currentText.length;
    const textToAdd = pastedText.substring(0, remainingChars);
    const newValue = currentText + textToAdd;

    // Apply field-specific formatting
    let formattedValue = newValue;
    if (field === 'legalEntityCode' || field === 'businessUnitCode') {
      formattedValue = newValue.toUpperCase();
    } else if (field === 'legalEntityName' || field === 'businessUnitName') {
      formattedValue = toTitleCase(newValue);
    } else if (field === 'comments') {
      formattedValue = newValue.charAt(0).toUpperCase() + newValue.slice(1);
    }

    // Update the appropriate state
    if (isEditing) {
      if (validateField(field, formattedValue)) {
        setEditValues(prev => ({ ...prev, [field]: formattedValue }));
        if (fieldErrors.edit?.[field]) {
          const newErrors = { ...fieldErrors };
          delete newErrors.edit[field];
          if (Object.keys(newErrors.edit).length === 0) delete newErrors.edit;
          setFieldErrors(newErrors);
        }
      }
    } else if (index !== null) {
      updateRow(index, field, formattedValue);
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
    <div className="config-main" style={{
      minHeight: '80vh',
    }}>
      <div style={{
        padding: '2rem 2rem 1rem 2rem',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#2563eb' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{
        marginTop: '0',
      }}>
        <h2 style={{
          margin: 0,
          color: '#333',
        }}>Legal Entity Master</h2>
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
          padding: '12px 20px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.3s ease-out',
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

      <TableContainer component={Paper} sx={{
        maxHeight: '500px',
        overflowY: 'auto',
        paddingBottom: '2rem',
        '@media (max-width: 768px)': {
          maxHeight: '400px',
          overflowX: 'auto', // Allow horizontal scrolling on mobile
          paddingBottom: '1rem',
        }
      }}>
        <Table stickyHeader sx={{
          minWidth: '1400px', // Ensure table doesn't get too narrow with all columns
          '@media (max-width: 768px)': {
            '& .MuiTableCell-root': {
              padding: '4px 8px',
              fontSize: '13px',
            },
            '& .MuiTextField-root': {
              '& .MuiOutlinedInput-root': {
                fontSize: '12px',
              },
            },
            '& .MuiButton-root': {
              fontSize: '11px',
              padding: '2px 6px',
              minWidth: 'auto',
            },
          },
        }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{
                fontWeight: 'bold',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                fontSize: '15px',
                '@media (max-width: 768px)': {
                  padding: '6px 8px',
                  fontSize: '13px',
                }
              }}>Legal Entity Code</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                fontSize: '15px',
                '@media (max-width: 768px)': {
                  padding: '6px 8px',
                  fontSize: '13px',
                }
              }}>Legal Entity Name</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                fontSize: '15px',
                '@media (max-width: 768px)': {
                  padding: '6px 8px',
                  fontSize: '13px',
                }
              }}>Business Unit Code</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                fontSize: '15px',
                '@media (max-width: 768px)': {
                  padding: '6px 8px',
                  fontSize: '13px',
                }
              }}>Business Unit Name</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                fontSize: '15px',
                '@media (max-width: 768px)': {
                  padding: '6px 8px',
                  fontSize: '13px',
                }
              }}>Global Region</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                fontSize: '15px',
                '@media (max-width: 768px)': {
                  padding: '6px 8px',
                  fontSize: '13px',
                }
              }}>Country</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                fontSize: '15px',
                '@media (max-width: 768px)': {
                  padding: '6px 8px',
                  fontSize: '13px',
                }
              }}>Comments / Notes</TableCell>
              <TableCell sx={{
                fontWeight: 'bold',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                fontSize: '15px',
                '@media (max-width: 768px)': {
                  padding: '6px 8px',
                  fontSize: '13px',
                }
              }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No records found. Click "Add New Row" to add a legal entity.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={index}
                  ref={!row.isSaved ? newRowRef : null}
                  sx={{
                    '&:hover': { backgroundColor: '#f8f9fa' },
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  <TableCell sx={{
                    padding: !row.isSaved || editingItem === row.id ? '12px 12px' : '6px 12px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #dee2e6',
                    '@media (max-width: 768px)': {
                      padding: !row.isSaved || editingItem === row.id ? '10px 8px' : '4px 8px',
                    }
                  }}>
                    {editingItem === row.id ? (
                      renderInputWithError(
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.legalEntityCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            if (validateField('legalEntityCode', value)) {
                              setEditValues({ ...editValues, legalEntityCode: value });
                              if (fieldErrors.edit?.legalEntityCode) {
                                const newErrors = { ...fieldErrors };
                                delete newErrors.edit.legalEntityCode;
                                if (Object.keys(newErrors.edit).length === 0) delete newErrors.edit;
                                setFieldErrors(newErrors);
                              }
                            }
                          }}
                          onPaste={(e) => handlePasteWithLimit(e, 'legalEntityCode', editValues.legalEntityCode, true)}
                          placeholder="Legal Entity Code"
                          variant="outlined"
                          error={!!fieldErrors.edit?.legalEntityCode}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                              backgroundColor: 'white',
                            },
                          }}
                        />,
                        fieldErrors.edit?.legalEntityCode,
                        <div style={{ fontSize: '12px', color: (editValues.legalEntityCode?.length || 0) >= getCharacterCount('legalEntityCode') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {(editValues.legalEntityCode?.length || 0)}/{getCharacterCount('legalEntityCode')} {(editValues.legalEntityCode?.length || 0) >= getCharacterCount('legalEntityCode') && 'Limit'}
                        </div>,
                        true,
                        'legalEntityCode',
                        editValues.legalEntityCode || ''
                      )
                    ) : (
                      <div>
                        {row.isSaved ? (
                          <div style={{
                            fontSize: '14px',
                            padding: '8px 0',
                            color: '#333',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {row.legalEntityCode || '-'}
                          </div>
                        ) : (
                          renderInputWithError(
                            <TextField
                              size="small"
                              style={{ flex: 1 }}
                              value={row.legalEntityCode}
                              onChange={(e) => {
                                updateRow(index, 'legalEntityCode', e.target.value);
                                if (fieldErrors[index]?.legalEntityCode) {
                                  const newErrors = { ...fieldErrors };
                                  delete newErrors[index].legalEntityCode;
                                  if (Object.keys(newErrors[index]).length === 0) delete newErrors[index];
                                  setFieldErrors(newErrors);
                                }
                              }}
                              onPaste={(e) => handlePasteWithLimit(e, 'legalEntityCode', row.legalEntityCode, false, index)}
                              placeholder="TML"
                              variant="outlined"
                              error={!!fieldErrors[index]?.legalEntityCode}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '14px',
                                },
                              }}
                            />,
                            fieldErrors[index]?.legalEntityCode,
                            <div style={{ fontSize: '12px', color: row.legalEntityCode.length >= getCharacterCount('legalEntityCode') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                              {row.legalEntityCode.length}/{getCharacterCount('legalEntityCode')} {row.legalEntityCode.length >= getCharacterCount('legalEntityCode') && 'Limit'}
                            </div>,
                            false,
                            'legalEntityCode',
                            row.legalEntityCode
                          )
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell sx={{
                    padding: !row.isSaved || editingItem === row.id ? '12px 12px' : '6px 12px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #dee2e6',
                    '@media (max-width: 768px)': {
                      padding: !row.isSaved || editingItem === row.id ? '10px 8px' : '4px 8px',
                    }
                  }}>
                    {editingItem === row.id ? (
                      renderInputWithError(
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.legalEntityName}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validateField('legalEntityName', value)) {
                              const formattedValue = toTitleCase(value);
                              setEditValues({ ...editValues, legalEntityName: formattedValue });
                              if (fieldErrors.edit?.legalEntityName) {
                                const newErrors = { ...fieldErrors };
                                delete newErrors.edit.legalEntityName;
                                if (Object.keys(newErrors.edit).length === 0) delete newErrors.edit;
                                setFieldErrors(newErrors);
                              }
                            }
                          }}
                          onPaste={(e) => handlePasteWithLimit(e, 'legalEntityName', editValues.legalEntityName, true)}
                          placeholder="Tata Motors Limited"
                          variant="outlined"
                          error={!!fieldErrors.edit?.legalEntityName}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                            },
                          }}
                        />,
                        fieldErrors.edit?.legalEntityName,
                        <div style={{ fontSize: '12px', color: (editValues.legalEntityName?.length || 0) >= getCharacterCount('legalEntityName') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {(editValues.legalEntityName?.length || 0)}/{getCharacterCount('legalEntityName')} {(editValues.legalEntityName?.length || 0) >= getCharacterCount('legalEntityName') && 'Limit'}
                        </div>,
                        true,
                        'legalEntityName',
                        editValues.legalEntityName || ''
                      )
                    ) : (
                      <div>
                        {row.isSaved ? (
                          <div style={{
                            fontSize: '14px',
                            padding: '8px 0',
                            color: '#333',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {row.legalEntityName || '-'}
                          </div>
                        ) : (
                          renderInputWithError(
                            <TextField
                              size="small"
                              style={{ flex: 1 }}
                              value={row.legalEntityName}
                              onChange={(e) => {
                                updateRow(index, 'legalEntityName', toTitleCase(e.target.value));
                                if (fieldErrors[index]?.legalEntityName) {
                                  const newErrors = { ...fieldErrors };
                                  delete newErrors[index].legalEntityName;
                                  if (Object.keys(newErrors[index]).length === 0) delete newErrors[index];
                                  setFieldErrors(newErrors);
                                }
                              }}
                              onPaste={(e) => handlePasteWithLimit(e, 'legalEntityName', row.legalEntityName, false, index)}
                              placeholder="Tata Motors Limited"
                              variant="outlined"
                              error={!!fieldErrors[index]?.legalEntityName}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '14px',
                                },
                              }}
                            />,
                            fieldErrors[index]?.legalEntityName,
                            <div style={{ fontSize: '12px', color: row.legalEntityName.length >= getCharacterCount('legalEntityName') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                              {row.legalEntityName.length}/{getCharacterCount('legalEntityName')} {row.legalEntityName.length >= getCharacterCount('legalEntityName') && 'Limit'}
                            </div>,
                            false,
                            'legalEntityName',
                            row.legalEntityName
                          )
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell sx={{
                    padding: !row.isSaved || editingItem === row.id ? '12px 12px' : '6px 12px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #dee2e6',
                    '@media (max-width: 768px)': {
                      padding: !row.isSaved || editingItem === row.id ? '10px 8px' : '4px 8px',
                    }
                  }}>
                    {editingItem === row.id ? (
                      renderInputWithError(
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.businessUnitCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            if (validateField('businessUnitCode', value)) {
                              setEditValues({ ...editValues, businessUnitCode: value });
                              if (fieldErrors.edit?.businessUnitCode) {
                                const newErrors = { ...fieldErrors };
                                delete newErrors.edit.businessUnitCode;
                                if (Object.keys(newErrors.edit).length === 0) delete newErrors.edit;
                                setFieldErrors(newErrors);
                              }
                            }
                          }}
                          onPaste={(e) => handlePasteWithLimit(e, 'businessUnitCode', editValues.businessUnitCode, true)}
                          placeholder="BU001"
                          variant="outlined"
                          error={!!fieldErrors.edit?.businessUnitCode}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                            },
                          }}
                        />,
                        fieldErrors.edit?.businessUnitCode,
                        <div style={{ fontSize: '12px', color: (editValues.businessUnitCode?.length || 0) >= getCharacterCount('businessUnitCode') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {(editValues.businessUnitCode?.length || 0)}/{getCharacterCount('businessUnitCode')} {(editValues.businessUnitCode?.length || 0) >= getCharacterCount('businessUnitCode') && 'Limit'}
                        </div>,
                        true,
                        'businessUnitCode',
                        editValues.businessUnitCode || ''
                      )
                    ) : (
                      <div>
                        {row.isSaved ? (
                          <div style={{
                            fontSize: '14px',
                            padding: '8px 0',
                            color: '#333',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {row.businessUnitCode || '-'}
                          </div>
                        ) : (
                          renderInputWithError(
                            <TextField
                              size="small"
                              style={{ flex: 1 }}
                              value={row.businessUnitCode}
                              onChange={(e) => {
                                updateRow(index, 'businessUnitCode', e.target.value);
                                if (fieldErrors[index]?.businessUnitCode) {
                                  const newErrors = { ...fieldErrors };
                                  delete newErrors[index].businessUnitCode;
                                  if (Object.keys(newErrors[index]).length === 0) delete newErrors[index];
                                  setFieldErrors(newErrors);
                                }
                              }}
                              onPaste={(e) => handlePasteWithLimit(e, 'businessUnitCode', row.businessUnitCode, false, index)}
                              placeholder="BU001"
                              variant="outlined"
                              error={!!fieldErrors[index]?.businessUnitCode}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '14px',
                                },
                              }}
                            />,
                            fieldErrors[index]?.businessUnitCode,
                            <div style={{ fontSize: '12px', color: row.businessUnitCode.length >= getCharacterCount('businessUnitCode') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                              {row.businessUnitCode.length}/{getCharacterCount('businessUnitCode')} {row.businessUnitCode.length >= getCharacterCount('businessUnitCode') && 'Limit'}
                            </div>,
                            false,
                            'businessUnitCode',
                            row.businessUnitCode
                          )
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell sx={{
                    padding: !row.isSaved || editingItem === row.id ? '12px 12px' : '6px 12px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #dee2e6',
                    '@media (max-width: 768px)': {
                      padding: !row.isSaved || editingItem === row.id ? '10px 8px' : '4px 8px',
                    }
                  }}>
                    {editingItem === row.id ? (
                      renderInputWithError(
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.businessUnitName}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validateField('businessUnitName', value)) {
                              const formattedValue = toTitleCase(value);
                              setEditValues({ ...editValues, businessUnitName: formattedValue });
                              if (fieldErrors.edit?.businessUnitName) {
                                const newErrors = { ...fieldErrors };
                                delete newErrors.edit.businessUnitName;
                                if (Object.keys(newErrors.edit).length === 0) delete newErrors.edit;
                                setFieldErrors(newErrors);
                              }
                            }
                          }}
                          onPaste={(e) => handlePasteWithLimit(e, 'businessUnitName', editValues.businessUnitName, true)}
                          placeholder="Business Unit Name"
                          variant="outlined"
                          error={!!fieldErrors.edit?.businessUnitName}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                            },
                          }}
                        />,
                        fieldErrors.edit?.businessUnitName,
                        <div style={{ fontSize: '12px', color: (editValues.businessUnitName?.length || 0) >= getCharacterCount('businessUnitName') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {(editValues.businessUnitName?.length || 0)}/{getCharacterCount('businessUnitName')} {(editValues.businessUnitName?.length || 0) >= getCharacterCount('businessUnitName') && 'Limit'}
                        </div>,
                        true,
                        'businessUnitName',
                        editValues.businessUnitName || ''
                      )
                    ) : (
                      <div>
                        {row.isSaved ? (
                          <div style={{
                            fontSize: '14px',
                            padding: '8px 0',
                            color: '#333',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {row.businessUnitName || '-'}
                          </div>
                        ) : (
                          renderInputWithError(
                            <TextField
                              size="small"
                              style={{ flex: 1 }}
                              value={row.businessUnitName}
                              onChange={(e) => {
                                updateRow(index, 'businessUnitName', toTitleCase(e.target.value));
                                if (fieldErrors[index]?.businessUnitName) {
                                  const newErrors = { ...fieldErrors };
                                  delete newErrors[index].businessUnitName;
                                  if (Object.keys(newErrors[index]).length === 0) delete newErrors[index];
                                  setFieldErrors(newErrors);
                                }
                              }}
                              onPaste={(e) => handlePasteWithLimit(e, 'businessUnitName', row.businessUnitName, false, index)}
                              placeholder="Business Unit Name"
                              variant="outlined"
                              error={!!fieldErrors[index]?.businessUnitName}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '14px',
                                },
                              }}
                            />,
                            fieldErrors[index]?.businessUnitName,
                            <div style={{ fontSize: '12px', color: row.businessUnitName.length >= getCharacterCount('businessUnitName') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                              {row.businessUnitName.length}/{getCharacterCount('businessUnitName')} {row.businessUnitName.length >= getCharacterCount('businessUnitName') && 'Limit'}
                            </div>,
                            false,
                            'businessUnitName',
                            row.businessUnitName
                          )
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell sx={{
                    padding: !row.isSaved || editingItem === row.id ? '12px 12px' : '6px 12px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #dee2e6',
                    '@media (max-width: 768px)': {
                      padding: !row.isSaved || editingItem === row.id ? '10px 8px' : '4px 8px',
                    }
                  }}>
                    {editingItem === row.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', minHeight: '60px' }}>
                        <FormControl fullWidth size="small" error={!!fieldErrors.edit?.globalRegion}>
                          <Select
                            value={editValues.globalRegion || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEditValues(prev => ({ ...prev, globalRegion: value, country: '' })); // Clear country
                              if (fieldErrors.edit?.globalRegion) {
                                const newErrors = { ...fieldErrors };
                                delete newErrors.edit.globalRegion;
                                if (Object.keys(newErrors.edit).length === 0) delete newErrors.edit;
                                setFieldErrors(newErrors);
                              }
                            }}
                            displayEmpty
                            sx={{
                              fontSize: '14px',
                              backgroundColor: 'white',
                            }}
                          >
                            <MenuItem value="" disabled>Select Region</MenuItem>
                            {regionOptions.map((region, index) => (
                              <MenuItem
                                key={region.list_Of_Geography_id}
                                value={region.geoCode}
                                sx={{
                                  backgroundColor: region.geoCode === editValues.globalRegion ? '#e3f2fd' : 'white',
                                  '&.Mui-focusVisible': {
                                    backgroundColor: '#accafaff',
                                  }
                                }}
                              >
                                {region.geoCode}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <div style={{ height: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                          {fieldErrors.edit?.globalRegion && (
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                              {fieldErrors.edit.globalRegion}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {row.isSaved ? (
                          <div style={{
                            fontSize: '14px',
                            color: '#333',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {row.globalRegion || '-'}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', minHeight: '60px' }}>
                            <FormControl fullWidth size="small" error={!!fieldErrors[index]?.globalRegion}>
                              <Select
                                value={row.globalRegion || ''}
                                onChange={(e) => {
                                  updateRow(index, 'globalRegion', e.target.value);
                                  if (fieldErrors[index]?.globalRegion) {
                                    const newErrors = { ...fieldErrors };
                                    delete newErrors[index].globalRegion;
                                    if (Object.keys(newErrors[index]).length === 0) delete newErrors[index];
                                    setFieldErrors(newErrors);
                                  }
                                }}
                                displayEmpty
                                sx={{
                                  fontSize: '14px',
                                  backgroundColor: 'white',
                                }}
                              >
                                <MenuItem value="" disabled>Select Region</MenuItem>
                                {regionOptions.map((region, index) => (
                                  <MenuItem
                                    key={region.list_Of_Geography_id}
                                    value={region.geoCode}
                                    sx={{
                                      backgroundColor: region.geoCode === row.globalRegion ? '#e3f2fd' : 'white',
                                      '&.Mui-focusVisible': {
                                        backgroundColor: '#accafaff',
                                      }
                                    }}
                                  >
                                    {region.geoCode}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <div style={{ height: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                              {fieldErrors[index]?.globalRegion && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                                  {fieldErrors[index].globalRegion}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell sx={{
                    padding: !row.isSaved || editingItem === row.id ? '12px 12px' : '6px 12px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #dee2e6',
                    '@media (max-width: 768px)': {
                      padding: !row.isSaved || editingItem === row.id ? '10px 8px' : '4px 8px',
                    }
                  }}>
                    {editingItem === row.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', minHeight: '60px' }}>
                        <FormControl fullWidth size="small" error={!!fieldErrors.edit?.country}>
                          <Select
                            value={editValues.country || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEditValues(prev => ({ ...prev, country: value }));
                              if (fieldErrors.edit?.country) {
                                const newErrors = { ...fieldErrors };
                                delete newErrors.edit.country;
                                if (Object.keys(newErrors.edit).length === 0) delete newErrors.edit;
                                setFieldErrors(newErrors);
                              }
                            }}
                            displayEmpty
                            sx={{
                              fontSize: '14px',
                              backgroundColor: 'white',
                            }}
                          >
                            <MenuItem value="" disabled>Select Country</MenuItem>
                            {getFilteredCountryOptions(editValues.globalRegion).map(country => (
                              <MenuItem
                                key={country.list_Of_Countrie_id || country.Code}
                                value={country.Country_Name}
                                sx={{
                                  backgroundColor: country.Country_Name === editValues.country ? '#e3f2fd' : 'white',
                                  '&.Mui-focusVisible': {
                                    backgroundColor: '#accafaff',
                                  }
                                }}
                              >
                                {country.Country_Name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <div style={{ height: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                          {fieldErrors.edit?.country && (
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                              {fieldErrors.edit.country}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {row.isSaved ? (
                          <div style={{
                            fontSize: '14px',
                            color: '#333',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {row.country || '-'}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', minHeight: '60px' }}>
                            <FormControl fullWidth size="small" error={!!fieldErrors[index]?.country}>
                              <Select
                                value={row.country || ''}
                                onChange={(e) => {
                                  updateRow(index, 'country', e.target.value);
                                  if (fieldErrors[index]?.country) {
                                    const newErrors = { ...fieldErrors };
                                    delete newErrors[index].country;
                                    if (Object.keys(newErrors[index]).length === 0) delete newErrors[index];
                                    setFieldErrors(newErrors);
                                  }
                                }}
                                displayEmpty
                                sx={{
                                  fontSize: '14px',
                                  backgroundColor: 'white',
                                }}
                              >
                                <MenuItem value="" disabled>Select Country</MenuItem>
                                {getFilteredCountryOptions(row.globalRegion).map(country => (
                                  <MenuItem
                                    key={country.list_Of_Countrie_id || country.Code}
                                    value={country.Country_Name}
                                    sx={{
                                      backgroundColor: country.Country_Name === row.country ? '#e3f2fd' : 'white',
                                      '&.Mui-focusVisible': {
                                        backgroundColor: '#accafaff',
                                      }
                                    }}
                                  >
                                    {country.Country_Name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <div style={{ height: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                              {fieldErrors[index]?.country && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                                  {fieldErrors[index].country}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell sx={{
                    padding: !row.isSaved || editingItem === row.id ? '12px 12px' : '6px 12px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #dee2e6',
                    '@media (max-width: 768px)': {
                      padding: !row.isSaved || editingItem === row.id ? '10px 8px' : '4px 8px',
                    }
                  }}>
                    {editingItem === row.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', minHeight: '60px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TextField
                            size="small"
                            style={{ flex: 1 }}
                            value={editValues.comments}
                            onChange={(e) => {
                              const value = e.target.value;
                              handleInputChange('comments', value);
                              if (fieldErrors.edit?.comments) {
                                const newErrors = { ...fieldErrors };
                                delete newErrors.edit.comments;
                                if (Object.keys(newErrors.edit).length === 0) delete newErrors.edit;
                                setFieldErrors(newErrors);
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pastedText = e.clipboardData.getData('text');
                              const currentValue = editValues.comments || '';
                              const maxLength = 240;
                              const remainingChars = maxLength - currentValue.length;
                              const textToAdd = pastedText.substring(0, remainingChars);
                              const newValue = currentValue + textToAdd;
                              handleInputChange('comments', newValue);
                            }}
                            placeholder="Merged with LE002 in FY26"
                            variant="outlined"
                            error={!!fieldErrors.edit?.comments}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                fontSize: '14px',
                              },
                            }}
                          />
                          <div style={{ fontSize: '12px', color: (editValues.comments?.length || 0) >= getCharacterCount('comments') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                            {(editValues.comments?.length || 0)}/{getCharacterCount('comments')} {(editValues.comments?.length || 0) >= getCharacterCount('comments') && 'Limit'}
                          </div>
                        </div>
                        <div style={{ height: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                          {fieldErrors.edit?.comments && (
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                              {fieldErrors.edit.comments}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        {row.isSaved ? (
                          <div style={{
                            fontSize: '14px',
                            padding: '0px',
                            margin: '0px',
                            color: '#333',
                            maxWidth: '250px',
                            overflowX: 'hidden',
                            wordWrap: 'break-word',
                            whiteSpace: 'normal',
                            lineHeight: '1.4'
                          }}>
                            {row.comments || '-'}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', minHeight: '60px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <TextField
                                size="small"
                                style={{ flex: 1 }}
                                value={row.comments}
                                onChange={(e) => updateRow(index, 'comments', e.target.value)}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedText = e.clipboardData.getData('text');
                                  const currentValue = row.comments || '';
                                  const maxLength = 240;
                                  const remainingChars = maxLength - currentValue.length;
                                  const textToAdd = pastedText.substring(0, remainingChars);
                                  const newValue = currentValue + textToAdd;
                                  updateRow(index, 'comments', newValue);
                                }}
                                placeholder="Merged with LE002 in FY26"
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '14px',
                                  },
                                }}
                              />
                              <div style={{ fontSize: '12px', color: row.comments.length >= getCharacterCount('comments') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                                {row.comments.length}/{getCharacterCount('comments')} {row.comments.length >= getCharacterCount('comments') && 'Limit'}
                              </div>
                            </div>
                            <div style={{ height: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                              {/* No error for comments in new row validation, but if added */}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell sx={{
                    padding: !row.isSaved || editingItem === row.id ? '12px 4px' : '6px 4px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #dee2e6',
                    '@media (max-width: 768px)': {
                      padding: !row.isSaved || editingItem === row.id ? '10px 2px' : '4px 2px',
                    }
                  }}>
                    {editingItem === row.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-start', minHeight: '60px' }}>
                        <button
                          onClick={() => handleSaveEdit(row.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', marginTop: '-14px' }}
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', marginTop: '-14px' }}
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : !row.isSaved ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-start', minHeight: '60px' }}>
                        <button
                          onClick={() => handleDelete(row.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginTop: '-14px' }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }} ref={openMenuId === row.id ? menuRef : null}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                          title="Actions"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === row.id && (
                          <div style={{
                            position: 'absolute',
                            right: '100%',
                            top: index >= data.length - 2 ? 'auto' : '50%',
                            bottom: index >= data.length - 2 ? '0' : 'auto',
                            transform: index >= data.length - 2 ? 'none' : 'translateY(-50%)',
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
                                handleEdit(row.id);
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
                                handleDelete(row.id);
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
                  </TableCell>
                </TableRow>
              )))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{
        padding: '1rem',
        borderTop: '1px solid #dee2e6',
        display: 'flex',
        gap: '1rem',
        '@media (max-width: 768px)': {
          padding: '0.5rem',
          gap: '0.5rem',
        }
      }}>
        <Button
          variant="contained"
          startIcon={(() => {
            const hasUnsavedRow = data.some(row => !row.isSaved);
            return hasUnsavedRow ? null : <Plus size={16} />;
          })()}
          onClick={addNewRow}
          disabled={loading}
          sx={{
            backgroundColor: '#28a745',
            '&:hover': {
              backgroundColor: '#218838',
            },
            '@media (max-width: 768px)': {
              fontSize: '14px',
              padding: '8px 16px',
            },
          }}
        >
          {(() => {
            if (loading) return 'Saving...';

            // Check if there's an unsaved row (regardless of whether it has data)
            const hasUnsavedRow = data.some(row => !row.isSaved);

            if (hasUnsavedRow) {
              const unsavedCount = data.filter(row => !row.isSaved).length;
              return unsavedCount === 1 ? 'Save Record' : `Save ${unsavedCount} Records`;
            }

            return 'Add New Row';
          })()}
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download size={16} />}
          onClick={handleDownloadTemplate}
          sx={{
            backgroundColor: '#3b82f6',
            color: 'white',
            borderColor: '#3b82f6',
            '&:hover': {
              backgroundColor: '#2563eb',
              borderColor: '#2563eb',
            },
            '@media (max-width: 768px)': {
              fontSize: '14px',
              padding: '8px 16px',
            },
          }}
        >
          Download Template
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUploadLegalEntity}
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
        />
      </Box>

      <div style={{ height: '100px' }}></div>

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

      {/* Loading Overlay */}
      {(loading || uploading) && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
        </div>
      )}
      <SessionExpiredPopup />
    </div>
  );
};

export default LegalEntityMasterTable;
