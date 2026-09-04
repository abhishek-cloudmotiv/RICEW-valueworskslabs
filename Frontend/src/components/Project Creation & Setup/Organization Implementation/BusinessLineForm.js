import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit, Trash2, Save, X, MoreVertical, HelpCircle } from 'lucide-react';
import { TextField, MenuItem, Select, FormControl } from '@mui/material';
import PortfolioForm from './PortfolioForm';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../../utils/cognito-auth';
import { useSession } from '../../../context/SessionContext';

// MenuDropdown component with fixed positioning to prevent clipping
const MenuDropdown = ({ item, data, onEdit, onDelete, buttonRef }) => {
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (buttonRef && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position menu so the Delete button (last item) aligns with the three dots button
      // Each menu item is approximately 32px (8px padding top + 14px font + 8px padding bottom + 2px border)
      // Total menu height is roughly 98px for 3 items, so offset by that amount
      setPosition({
        top: rect.top - 40, // Offset to align delete button with button
        left: rect.left - 8 // 8px margin from button
      });
    }
  }, [buttonRef]);

  return (
    <div
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-95%)',
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 4000,
        minWidth: '120px',
        whiteSpace: 'nowrap'
      }}
    >
      <button
        onClick={onEdit}
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
        onClick={onDelete}
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
        <Trash2 size={14} style={{ color: '#ef4444' }} />
        <span>Delete</span>
      </button>
    </div>
  );
};

const BusinessLineForm = ({ onClose, organizationId, organizationName, setUnsavedChangesChecker, selectedProject }) => {
  const { handleAuthError } = useSession();
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

  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [selectedBusinessLineForPortfolio, setSelectedBusinessLineForPortfolio] = useState(null);

  const [portfolioFormUnsavedChangesChecker, setPortfolioFormUnsavedChangesChecker] = useState(null);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

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

  // Function to convert text to sentence case (capitalize first letter of first word only)
  const toSentenceCase = (str) => {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Function to capitalize only the first character
  const capitalizeFirstChar = (str) => {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Load data from API on component mount
  useEffect(() => {
    // Reset states on mount to ensure clean state
    setHasNewRow(false);
    setEditingItem(null);
    setEditValues({});

    loadBusinessLineData();
  }, [organizationId]);

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

  // Close help popup when clicking outside
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

  const getNextBusinessLineId = async () => {
    try {
      const idToken = await getIdToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch('https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/businessline/next-id', {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return null;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched next business line ID:', result);

        if (result.success && result.formattedId) {
          return DOMPurify.sanitize(String(result.formattedId || '').trim(), { ALLOWED_TAGS: [] });
        } else {
          console.error('Invalid response format for next business line ID');
          return null;
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching next business line ID:', error);
      handleAuthError(error.message);
      return null;
    }
  };

  const loadBusinessLineData = async () => {
    setLoading(true);
    try {
      const projectId = selectedProject?.id;
      const idToken = await getIdToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch(`https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/businessline/getDataByOrgId?orgId=${organizationId}&project_id=${projectId}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setData([]);
        setLoading(false);
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched business line data:', result);

        if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
          // Filter by active records (backend doesn't filter by delete_status yet)
          const filteredRecords = result.data.filter(item =>
            item.delete_status === "false"
          );

          const transformedData = filteredRecords.map((item, index) => ({
            id: index + 1,
            businessLineId: DOMPurify.sanitize(String(item.Business_Line_DisplayID || `BL${index + 1}`).trim(), { ALLOWED_TAGS: [] }),
            businessLineActualId: DOMPurify.sanitize(String(item.Business_Line_ID || '').trim(), { ALLOWED_TAGS: [] }),
            name: DOMPurify.sanitize(String(item.Business_Line_Name || '').trim(), { ALLOWED_TAGS: [] }),
            description: DOMPurify.sanitize(String(item.Business_Line_Description || '').trim(), { ALLOWED_TAGS: [] }),
            code: DOMPurify.sanitize(String(item.Business_Line_Code || '').trim(), { ALLOWED_TAGS: [] }),
            comments: DOMPurify.sanitize(String(item.Business_Line_Comments || '').trim(), { ALLOWED_TAGS: [] }),
            createdBy: DOMPurify.sanitize(String(item.createdby || 'SYSTEM').trim(), { ALLOWED_TAGS: [] }),
            createdDate: DOMPurify.sanitize(String(item.createddate || '').trim(), { ALLOWED_TAGS: [] }),
            lastUpdatedBy: DOMPurify.sanitize(String(item.lastupdatedby || 'SYSTEM').trim(), { ALLOWED_TAGS: [] }),
            lastUpdatedDate: DOMPurify.sanitize(String(item.lastupdateddate || '').trim(), { ALLOWED_TAGS: [] }),
            isSaved: true
          }));

          // Sort by Business_Line_ID (primary key) - ascending order
          transformedData.sort((a, b) => {
            const idA = parseInt(a.businessLineId.replace(/\D/g, '')) || 0;
            const idB = parseInt(b.businessLineId.replace(/\D/g, '')) || 0;
            return idA - idB;
          });

          setData(transformedData);
        } else {
          setData([]);
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        setData([]);
      }
    } catch (error) {
      console.error('Error loading business line data:', error);
      handleAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBusinessLine = async () => {
    // Check if there's an unsaved edit in progress on an existing record
    if (editingItem !== null) {
      const editingItemData = data.find(item => item.id === editingItem);
      if (editingItemData && editingItemData.isSaved) {
        // Editing an existing saved record
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and add a new business line?',
          async () => {
            // User confirmed - cancel the current edit and add new row
            setEditingItem(null);
            setEditValues({});
            setEditValidationErrors({});

            // Now add the new row
            await addNewBusinessLineRow();
          }
        );
        return;
      }
    }

    // If there's already a new row being edited, save it
    if (hasNewRow && editingItem) {
      await handleSaveEdit(editingItem);
      return;
    }

    // Otherwise, add a new row
    await addNewBusinessLineRow();
  };

  const addNewBusinessLineRow = async () => {
    // Get the next business line ID from API
    const nextBlId = await getNextBusinessLineId();
    if (!nextBlId) {
      setErrorMessage('Failed to generate business line ID. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
    const currentDate = new Date().toISOString().split('T')[0];

    const newRow = {
      id: newId,
      businessLineId: nextBlId,
      name: '',
      description: '',
      code: '',
      comments: '',
      createdBy: 'MKOTHARI',
      createdDate: currentDate,
      lastUpdatedBy: 'PMADMIN',
      lastUpdatedDate: currentDate,
      isSaved: false
    };

    setData([...data, newRow]);
    setEditingItem(newId);
    setEditValues(newRow);
    setHasNewRow(true);

    // Auto-scroll to the new row
    setTimeout(() => {
      const tableContainer = document.querySelector('.business-line-table-container');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const handleEdit = (id) => {
    const item = data.find(d => d.id === id);
    if (item) {
      // Check if there's an unsaved new row
      if (hasNewRow) {
        showConfirmation(
          'You have unsaved changes. Do you want to continue?',
          () => {
            // User confirmed - discard the unsaved row and proceed with edit
            setData(data.filter(row => row.isSaved));
            setHasNewRow(false);
            setValidationErrors({});
            setEditValidationErrors({});

            // Now set the edit mode
            setEditingItem(id);
            setEditValues({ ...item });
            setOpenMenuId(null);
          }
        );
      } else if (editingItem !== null && editingItem !== id) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
            // User confirmed, proceed to edit the new item
            setEditingItem(id);
            setEditValues({ ...item });
            setOpenMenuId(null);
          }
        );
      } else {
        // No unsaved changes, proceed normally
        setEditingItem(id);
        setEditValues({ ...item });
        setOpenMenuId(null);
      }
    }
  };

  const handleCancelEdit = () => {
    if (!editValues.isSaved) {
      setData(data.filter(item => item.id !== editingItem));
      setHasNewRow(false);
      // Clear validation errors for the cancelled new row
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[editingItem];
        return newErrors;
      });
    } else {
      setEditValidationErrors({});
    }
    setEditingItem(null);
    setEditValues({});
  };

  const handleSaveEdit = async (id) => {
    try {
      // Validation - check required fields
      const missingFields = [];
      const fieldsWithErrors = {};

      if (!editValues.name || editValues.name.trim() === '') {
        missingFields.push('Business Line Name');
        fieldsWithErrors.name = true;
      }
      if (!editValues.description || editValues.description.trim() === '') {
        missingFields.push('Description');
        fieldsWithErrors.description = true;
      }
      // Business Line Code is now auto-generated by backend, no frontend validation needed for creation
      // If it's an existing record, we keep the existing code read-only


      // Set validation errors to show messages below fields
      if (Object.keys(fieldsWithErrors).length > 0) {
        // Check if this is a new row (not saved) or existing record
        if (editValues.isSaved === false) {
          // For new rows, use validationErrors with row id
          setValidationErrors(prev => ({
            ...prev,
            [id]: fieldsWithErrors
          }));
        } else {
          // For existing records, use editValidationErrors
          setEditValidationErrors(fieldsWithErrors);
        }

        // Show error popup message
        const fieldCount = Object.keys(fieldsWithErrors).length;
        setErrorMessage(fieldCount > 1 ? 'The required fields are missing' : 'The required field is missing');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);

        return false; // Save failed
      }

      // Clear validation errors
      if (editValues.isSaved === false) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      } else {
        setEditValidationErrors({});
      }

      const currentDate = new Date().toISOString().split('T')[0];

      // Check if this is an existing record or new record
      const isUpdate = editValues.isSaved === true;

      console.log('handleSaveEdit - editValues:', editValues);
      console.log('handleSaveEdit - isUpdate:', isUpdate);

      const projectId = selectedProject?.id;
      const userId = selectedProject?.userId || '1';

      let payload;
      let endpoint;

      if (isUpdate) {
        // Update existing record
        payload = {
          Business_Line_ID: editValues.businessLineActualId,
          lastupdatedby: userId
        };

        // Include all fields that have values
        if (editValues.name && editValues.name.trim() !== '') {
          payload.Business_Line_Name = editValues.name;
        }
        if (editValues.description !== undefined) {
          payload.Business_Line_Description = editValues.description;
        }
        // Business_Line_Code is now auto-generated/updated by the backend based on Business_Line_Name
        if (editValues.comments !== undefined) {
          payload.Business_Line_Comments = editValues.comments;
        }
        // Include organization and other required fields
        payload.SI_Organization_Details_id = organizationId;
        payload.require_status = "active";
        payload.project_id = projectId;

        endpoint = 'https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/businessline/updateRecord';
      } else {
        // Create new record
        payload = {
          Business_Line_Name: editValues.name,
          Business_Line_Description: editValues.description,
          // Business_Line_Code is now auto-generated by the backend
          Business_Line_Comments: editValues.comments || '',
          user_id: userId,
          project_id: projectId,
          SI_Organization_Details_id: organizationId,
          createdby: userId
        };

        endpoint = 'https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/businessline/createPost';
      }

      const idToken = await getIdToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return false;
      }

      if (response.ok) {
        setSuccessMessage(isUpdate ? 'Business line updated successfully!' : 'Business line saved successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);

        setData(data.map(item =>
          item.id === id
            ? { ...editValues, isSaved: true, lastUpdatedBy: 'PMADMIN', lastUpdatedDate: currentDate }
            : item
        ));

        setEditingItem(null);
        setEditValues({});
        setHasNewRow(false);

        await loadBusinessLineData();
        return true; // Save succeeded
      } else {
        setErrorMessage('Failed to save business line');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return false; // Save failed
      }
    } catch (error) {
      console.error('Error saving business line:', error);
      handleAuthError(error.message);
      return false;
    }
  };

  const handleDelete = async (id) => {
    const rowToDelete = data.find(item => item.id === id);

    if (rowToDelete) {
      // Check if deleting an unsaved row
      if (!rowToDelete.isSaved) {
        // Always allow deleting unsaved rows
        setHasNewRow(false);
        setEditingItem(null);
        setEditValues({});
        setData(data.filter(item => item.id !== id));
        // Clear validation errors for the deleted row
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      } else {
        // For saved records, use custom confirmation dialog
        showConfirmation(
          'Are you sure you want to delete this business line? This action cannot be undone.',
          async () => {
            try {
              const idToken = await getIdToken();

              const projectId = selectedProject?.id;
              const userId = selectedProject?.userId || '1';

              const payload = {
                Business_Line_ID: rowToDelete.businessLineActualId,
                project_id: projectId,
                lastupdatedby: userId
              };

              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              };

              const response = await fetch('https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/businessline/deleteRecord', {
                method: 'DELETE',
                headers: headers,
                body: JSON.stringify(payload)
              });

              if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
              }

              if (response.ok) {
                setSuccessMessage('Business line deleted successfully!');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);

                setData(data.filter(d => d.id !== id));
                setOpenMenuId(null);

                // Clear editing state if this was the item being edited
                if (editingItem === id) {
                  setEditingItem(null);
                  setEditValues({});
                }
              } else {
                setErrorMessage('Failed to delete business line');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
              }
            } catch (error) {
              console.error('Error deleting business line:', error);
              handleAuthError(error.message);
            }
          }
        );
      }
    }
  };

  const handleAddPortfolio = (item) => {
    // Check if there's an unsaved edit in progress
    if (editingItem !== null) {
      const editingItemData = data.find(d => d.id === editingItem);
      if (editingItemData && editingItemData.isSaved) {
        // Editing an existing saved record
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and add a portfolio?',
          () => {
            // User confirmed - cancel the current edit and add portfolio
            setEditingItem(null);
            setEditValues({});
            setEditValidationErrors({});

            // Now add the portfolio
            proceedWithAddPortfolio(item);
          }
        );
        return;
      }
    }

    // If there's already a new row being edited, discard it
    if (hasNewRow && editingItem) {
      // Show confirmation to discard changes
      showConfirmation(
        'You have unsaved changes in the new business line. Do you want to discard them and add a portfolio?',
        () => {
          // User confirmed - discard the unsaved row and proceed
          setData(prevData => prevData.filter(d => d.id !== editingItem));
          setHasNewRow(false);
          setEditingItem(null);
          setEditValues({});
          setValidationErrors({});

          // Now proceed with adding portfolio
          proceedWithAddPortfolio(item);
        }
      );
      return;
    }

    // Otherwise, proceed directly
    proceedWithAddPortfolio(item);
  };

  const proceedWithAddPortfolio = (item) => {
    // Clear any editing state and error messages before navigating
    setEditingItem(null);
    setEditValues({});
    setHasNewRow(false);
    setShowErrorMessage(false);
    setErrorMessage('');
    setValidationErrors({});
    setEditValidationErrors({});

    setSelectedBusinessLineForPortfolio({
      id: item.businessLineActualId,
      displayId: item.businessLineId,
      name: item.name
    });
    setShowPortfolioForm(true);
  };

  const handleClosePortfolioForm = () => {
    // Check for unsaved changes in PortfolioForm
    if (portfolioFormUnsavedChangesChecker && portfolioFormUnsavedChangesChecker()) {
      showConfirmation(
        'You have unsaved changes in the Portfolio form. Are you sure you want to close without saving?',
        () => {
          setShowPortfolioForm(false);
          setSelectedBusinessLineForPortfolio(null);
          setPortfolioFormUnsavedChangesChecker(null);
        }
      );
    } else {
      setShowPortfolioForm(false);
      setSelectedBusinessLineForPortfolio(null);
      setPortfolioFormUnsavedChangesChecker(null);
    }
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => {
      const newValues = { ...prev, [field]: value };
      return newValues;
    });
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
      zIndex: 3000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '90%',
        maxWidth: '1600px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '24px', fontWeight: '600' }}>Business Line Form</h1>
            <h2 style={{ margin: '0 0 4px 0', color: '#333', fontSize: '18px' }}>Organization Name: {organizationName}</h2>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Organization ID: {organizationId}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                padding: '8px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Help Modal */}
        {showHelpPopup && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4500
          }}>
            <div ref={helpPopupRef} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              width: '640px',
              maxWidth: '90vw',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
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
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this form?</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                      The <strong>Business Line Form</strong> manages the business lines that belong to an implementing partner organization. A Business Line represents a distinct service area or practice (e.g., Technology Consulting, Finance Transformation) within the organization's ERP engagement structure.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                      Business Lines are the second level of the organization hierarchy: <strong>Organization → Business Line → Portfolio → Service Line</strong>. They are used to group portfolios and service lines, and are referenced in rate cards for billing and cost planning across the project.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li><strong>Business Line ID</strong> — System-generated unique identifier for the business line.</li>
                      <li><strong>Code</strong> — Auto-generated short code based on the Business Line Name. Read-only; updated by the backend when the name changes.</li>
                      <li><strong>Business Line Name</strong> — The name of the practice or service area (required, max 100 characters).</li>
                      <li><strong>Description</strong> — A brief explanation of what this business line covers (required, max 200 characters).</li>
                      <li><strong>Comments</strong> — Optional notes or context about the business line (max 240 characters).</li>
                      <li><strong>Add Portfolio</strong> — Opens the Portfolio form to add portfolios under this business line.</li>
                      <li><strong>Actions</strong> — Edit or Delete the business line via the ⋮ menu.</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this form</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li>Click <strong>Add Business Line</strong> to create a new row. Enter the Name and Description, then click the <strong>Save (✓)</strong> icon to save.</li>
                      <li>Use the <strong>⋮ Actions</strong> menu to <strong>Edit</strong> or <strong>Delete</strong> a saved business line.</li>
                      <li>Click <strong>+ Portfolio</strong> on any saved row to open the Portfolio form and add portfolios under that business line.</li>
                      <li>Click the <strong>X</strong> (Cancel) icon while editing to discard unsaved changes.</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li><strong>Business Line Name</strong> and <strong>Description</strong> are required fields — saving will fail without them.</li>
                      <li>The <strong>Code</strong> is auto-generated from the name by the backend and cannot be edited manually.</li>
                      <li>Only one row can be in edit mode at a time. You will be prompted to discard changes before switching rows.</li>
                      <li>The <strong>+ Portfolio</strong> button is only visible when no row is being edited.</li>
                    </ul>
                  </div>

                </div>
              </div>
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
            zIndex: 9999
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

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <div className="business-line-table-container" style={{ maxHeight: '500px', overflowY: 'auto', overflow: 'visible' }}>
            <table className="config-table" style={{ fontSize: '15px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 12px', fontSize: '16px', width: '12%' }}>Business Line ID</th>
                  <th style={{ padding: '8px 12px', fontSize: '16px', width: '12%' }}>Code</th>
                  <th style={{ padding: '8px 12px', fontSize: '16px', width: '20%' }}>Business Line Name</th>
                  <th style={{ padding: '8px 12px', fontSize: '16px', width: '20%' }}>Description</th>
                  <th style={{ padding: '8px 12px', fontSize: '16px', width: '15%' }}>Comments</th>
                  <th style={{ padding: '8px 12px', fontSize: '16px', width: '12%', textAlign: 'center' }}>Add Portfolio</th>
                  <th style={{ padding: '8px 12px', fontSize: '16px', width: '9%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                      No business lines found. Click "Add Business Line" to create one.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id} style={{ height: '40px', backgroundColor: 'transparent' }}>
                      <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                        <div style={{ paddingTop: editingItem === item.id ? '18px' : '0' }}>
                          {editingItem === item.id && item.isSaved ? (
                            <span style={{ fontWeight: '500', color: '#374151' }}>{item.businessLineId}</span>
                          ) : (
                            <span>{item.businessLineId}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                        {editingItem === item.id ? (
                          <div style={{ paddingTop: '6px' }}>
                            <div style={{
                              padding: '8px 12px',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '4px',
                              fontSize: '14px',
                              color: '#6b7280',
                              fontStyle: 'italic',
                              border: '1px solid #ddd',
                              width: '140px'
                            }}>
                              {item.isSaved ? (editValues.code || 'Auto-updating...') : 'Auto-generated'}
                            </div>
                          </div>
                        ) : (
                          <span>{item.code}</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                        {editingItem === item.id ? (
                          <div style={{ paddingTop: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <TextField
                                size="small"
                                style={{ flex: 1 }}
                                value={editValues.name || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const filteredValue = value.replace(/[^a-zA-Z0-9\s&\-.,'\(\)\/]/g, '').substring(0, 100);
                                  const formattedValue = toTitleCase(filteredValue);
                                  handleInputChange('name', formattedValue);
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedText = e.clipboardData.getData('text');
                                  const currentValue = editValues.name || '';
                                  const maxLength = 100;
                                  const remainingChars = maxLength - currentValue.length;
                                  const textToAdd = pastedText.substring(0, remainingChars);
                                  const newValue = currentValue + textToAdd;
                                  const filteredValue = newValue.replace(/[^a-zA-Z0-9\s&\-.,'\(\)\/]/g, '').substring(0, 100);
                                  const formattedValue = toTitleCase(filteredValue);
                                  handleInputChange('name', formattedValue);
                                }}
                                placeholder="Business line name"
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '14px',
                                    backgroundColor: 'white',
                                  },
                                }}
                              />
                              <div style={{ fontSize: '12px', color: (editValues.name || '').length >= 100 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                                {(editValues.name || '').length}/100 {(editValues.name || '').length >= 100 && 'Limit'}
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                              {(item.isSaved ? editValidationErrors.name : validationErrors[item.id]?.name) && 'Required field'}
                            </div>
                          </div>
                        ) : (
                          <span>{item.name}</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                        {editingItem === item.id ? (
                          <div style={{ paddingTop: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <TextField
                                size="small"
                                style={{ flex: 1 }}
                                value={editValues.description || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const filteredValue = value.replace(/[^a-zA-Z0-9\s&\-.,'\(\)\/]/g, '').substring(0, 200);
                                  const formattedValue = toSentenceCase(filteredValue);
                                  handleInputChange('description', formattedValue);
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedText = e.clipboardData.getData('text');
                                  const currentValue = editValues.description || '';
                                  const maxLength = 200;
                                  const remainingChars = maxLength - currentValue.length;
                                  const textToAdd = pastedText.substring(0, remainingChars);
                                  const newValue = currentValue + textToAdd;
                                  const filteredValue = newValue.replace(/[^a-zA-Z0-9\s&\-.,'\(\)\/]/g, '').substring(0, 200);
                                  const formattedValue = toSentenceCase(filteredValue);
                                  handleInputChange('description', formattedValue);
                                }}
                                placeholder="Business line description"
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '14px',
                                    backgroundColor: 'white',
                                  },
                                }}
                              />
                              <div style={{ fontSize: '12px', color: (editValues.description || '').length >= 200 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                                {(editValues.description || '').length}/200 {(editValues.description || '').length >= 200 && 'Limit'}
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                              {(item.isSaved ? editValidationErrors.description : validationErrors[item.id]?.description) && 'Required field'}
                            </div>
                          </div>
                        ) : (
                          <span style={{
                            display: 'block',
                            wordWrap: 'break-word',
                            whiteSpace: 'normal',
                            fontSize: '14px',
                            lineHeight: '1.4'
                          }}>
                            {item.description || ''}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                        {editingItem === item.id ? (
                          <div style={{ paddingTop: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <TextField
                                size="small"
                                style={{ flex: 1 }}
                                value={editValues.comments || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Enforce 240 character limit, capitalize first character
                                  const formattedValue = capitalizeFirstChar(value.substring(0, 240));
                                  handleInputChange('comments', formattedValue);
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedText = e.clipboardData.getData('text');
                                  const currentValue = editValues.comments || '';
                                  // Enforce 240 character limit on pasted text, capitalize first character
                                  const newValue = (currentValue + pastedText).substring(0, 240);
                                  const formattedValue = capitalizeFirstChar(newValue);
                                  handleInputChange('comments', formattedValue);
                                }}
                                placeholder="Add comments"
                                variant="outlined"
                                multiline
                                minRows={1}
                                maxRows={2}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '14px',
                                    backgroundColor: 'white',
                                  },
                                }}
                              />
                              <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                {(editValues.comments || '').length}/240
                              </div>
                            </div>
                            {(editValues.comments || '').length >= 240 && (
                              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500' }}>
                                240 Limit exceeded
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{
                            display: 'block',
                            wordWrap: 'break-word',
                            whiteSpace: 'normal',
                            fontSize: '14px',
                            lineHeight: '1.4'
                          }}>
                            {item.comments || ''}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {editingItem === null ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              onClick={() => handleAddPortfolio(item)}
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Add Portfolio"
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                            >
                              <Plus size={14} />
                              Portfolio
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div className="action-icons" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                          {editingItem === item.id && item.isSaved ? (
                            <>
                              <button
                                className="action-btn save-btn"
                                onClick={() => handleSaveEdit(item.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#28a745', padding: '4px' }}
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
                          ) : (
                            <div style={{ position: 'relative' }} ref={openMenuId === item.id ? menuRef : null}>
                              <button
                                ref={openMenuId === item.id ? menuRef : null}
                                className="action-btn menu-btn"
                                onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                                title="Actions"
                              >
                                <MoreVertical size={18} />
                              </button>
                              {openMenuId === item.id && (
                                <MenuDropdown
                                  item={item}
                                  data={data}
                                  buttonRef={menuRef}
                                  onEdit={() => {
                                    handleEdit(item.id);
                                    setOpenMenuId(null);
                                  }}
                                  onDelete={() => {
                                    handleDelete(item.id);
                                    setOpenMenuId(null);
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add New Business Line Button */}
          <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', padding: '0 24px 24px 24px' }}>
            <button
              className="add-btn"
              style={{ width: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={handleAddBusinessLine}
              disabled={loading}
            >
              {hasNewRow ? (
                <>
                  <Save size={18} />
                  <span>Save Business Line</span>
                </>
              ) : (
                <>
                  <Plus size={18} />
                  <span>Add Business Line</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Portfolio Form */}
      {showPortfolioForm && selectedBusinessLineForPortfolio && (
        <PortfolioForm
          businessLineId={selectedBusinessLineForPortfolio.id}
          businessLineDisplayId={selectedBusinessLineForPortfolio.displayId}
          businessLineName={selectedBusinessLineForPortfolio.name}
          organizationId={organizationId}
          organizationName={organizationName}
          onClose={handleClosePortfolioForm}
          setUnsavedChangesChecker={setPortfolioFormUnsavedChangesChecker}
          selectedProject={selectedProject}
        />
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

export default BusinessLineForm;


