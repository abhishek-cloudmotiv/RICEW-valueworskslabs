import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Edit, Trash2, X, Save, MoreVertical, Lock, Unlock, HelpCircle } from 'lucide-react';
import { TextField, MenuItem, Select, FormControl } from '@mui/material';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import { useNavigate } from 'react-router-dom';

// LOV data for resource task fields

const RicewOrganizationTaskMapping = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError, userId, projectId, projectName } = useSession();
  const [data, setData] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [changedItems, setChangedItems] = useState(new Set());
  const [isFirstSave, setIsFirstSave] = useState(true);
  const [savedItemIds, setSavedItemIds] = useState(new Set());
  const [hasNewRow, setHasNewRow] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    ricewName: '',
    complexity: '',
    isActive: true,
    fsWriting: '',
    fsReview: '',
    tsWriting: '',
    tsReview: '',
    codeDevlopment: '',
    codeReview: '',
    unitTesting: '',
    technicalSupport: '',
    migrationDocCreation: '',
    migrationEffort: '',
    pglSupport: '',
    pmoEffort: '',
    contingency: '',
    totalHours: '',
    projectId: projectId || selectedProject?.id || ''
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [dataFromBackend, setDataFromBackend] = useState(false);
  const [originalData, setOriginalData] = useState([]);
  const [originalEmptyFields, setOriginalEmptyFields] = useState({}); // Track fields that were originally empty
  const [groupModifiedFields, setGroupModifiedFields] = useState({}); // Track fields modified by group selection
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitValidationErrors, setSubmitValidationErrors] = useState({});
  // LOV data for Onsite/Offshore selection from API
  const [lovData, setLovData] = useState([]);

  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const helpPopupRef = useRef(null);
  const [editingFields, setEditingFields] = useState({}); // Track which fields are being edited

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const [isMasterData, setIsMasterData] = useState(false); // true when showing master data for copying

  // Draft functionality
  const [isDraftOrganization, setIsDraftOrganization] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Lock/Unlock functionality
  const [isLocked, setIsLocked] = useState(false);
  const [lockingUnlocking, setLockingUnlocking] = useState(false);

  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // Column group LOV selections
  const [fsGroupSelection, setFsGroupSelection] = useState('');
  const [tsGroupSelection, setTsGroupSelection] = useState('');
  const [buildGroupSelection, setBuildGroupSelection] = useState('');
  const [testingGroupSelection, setTestingGroupSelection] = useState('');
  const [migrationGroupSelection, setMigrationGroupSelection] = useState('');
  const [pglPmoGroupSelection, setPglPmoGroupSelection] = useState('');

  // Handle group selection change
  const handleGroupSelection = (groupType, value) => {
    if (groupType === 'fs') {
      setFsGroupSelection(value);
      if (value) {
        const updatedData = data.map(item => ({
          ...item,
          fsWriting: value,
          fsReview: value
        }));
        setData(updatedData);

        // Mark these fields as group-modified for all records
        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          newGroupModified[`${item.id}_fsWriting`] = true;
          newGroupModified[`${item.id}_fsReview`] = true;
        });
        setGroupModifiedFields(newGroupModified);
      } else {
        // Reset field values to original and clear group-modified tracking
        const updatedData = data.map(item => {
          const original = originalData.find(orig => orig.id === item.id);
          return {
            ...item,
            fsWriting: original?.fsWriting || '',
            fsReview: original?.fsReview || ''
          };
        });
        setData(updatedData);

        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          delete newGroupModified[`${item.id}_fsWriting`];
          delete newGroupModified[`${item.id}_fsReview`];
        });
        setGroupModifiedFields(newGroupModified);
      }
    } else if (groupType === 'ts') {
      setTsGroupSelection(value);
      if (value) {
        const updatedData = data.map(item => ({
          ...item,
          tsWriting: value,
          tsReview: value
        }));
        setData(updatedData);

        // Mark these fields as group-modified for all records
        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          newGroupModified[`${item.id}_tsWriting`] = true;
          newGroupModified[`${item.id}_tsReview`] = true;
        });
        setGroupModifiedFields(newGroupModified);
      } else {
        // Reset field values to original and clear group-modified tracking
        const updatedData = data.map(item => {
          const original = originalData.find(orig => orig.id === item.id);
          return {
            ...item,
            tsWriting: original?.tsWriting || '',
            tsReview: original?.tsReview || ''
          };
        });
        setData(updatedData);

        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          delete newGroupModified[`${item.id}_tsWriting`];
          delete newGroupModified[`${item.id}_tsReview`];
        });
        setGroupModifiedFields(newGroupModified);
      }
    } else if (groupType === 'build') {
      setBuildGroupSelection(value);
      if (value) {
        const updatedData = data.map(item => ({
          ...item,
          codeDevlopment: value,
          codeReview: value
        }));
        setData(updatedData);

        // Mark these fields as group-modified for all records
        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          newGroupModified[`${item.id}_codeDevlopment`] = true;
          newGroupModified[`${item.id}_codeReview`] = true;
        });
        setGroupModifiedFields(newGroupModified);
      } else {
        // Reset field values to original and clear group-modified tracking
        const updatedData = data.map(item => {
          const original = originalData.find(orig => orig.id === item.id);
          return {
            ...item,
            codeDevlopment: original?.codeDevlopment || '',
            codeReview: original?.codeReview || ''
          };
        });
        setData(updatedData);

        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          delete newGroupModified[`${item.id}_codeDevlopment`];
          delete newGroupModified[`${item.id}_codeReview`];
        });
        setGroupModifiedFields(newGroupModified);
      }
    } else if (groupType === 'testing') {
      setTestingGroupSelection(value);
      if (value) {
        const updatedData = data.map(item => ({
          ...item,
          unitTesting: value,
          technicalSupport: value
        }));
        setData(updatedData);

        // Mark these fields as group-modified for all records
        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          newGroupModified[`${item.id}_unitTesting`] = true;
          newGroupModified[`${item.id}_technicalSupport`] = true;
        });
        setGroupModifiedFields(newGroupModified);
      } else {
        // Reset field values to original and clear group-modified tracking
        const updatedData = data.map(item => {
          const original = originalData.find(orig => orig.id === item.id);
          return {
            ...item,
            unitTesting: original?.unitTesting || '',
            technicalSupport: original?.technicalSupport || ''
          };
        });
        setData(updatedData);

        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          delete newGroupModified[`${item.id}_unitTesting`];
          delete newGroupModified[`${item.id}_technicalSupport`];
        });
        setGroupModifiedFields(newGroupModified);
      }
    } else if (groupType === 'migration') {
      setMigrationGroupSelection(value);
      if (value) {
        const updatedData = data.map(item => ({
          ...item,
          migrationDocCreation: value,
          migrationEffort: value
        }));
        setData(updatedData);

        // Mark these fields as group-modified for all records
        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          newGroupModified[`${item.id}_migrationDocCreation`] = true;
          newGroupModified[`${item.id}_migrationEffort`] = true;
        });
        setGroupModifiedFields(newGroupModified);
      } else {
        // Reset field values to original and clear group-modified tracking
        const updatedData = data.map(item => {
          const original = originalData.find(orig => orig.id === item.id);
          return {
            ...item,
            migrationDocCreation: original?.migrationDocCreation || '',
            migrationEffort: original?.migrationEffort || ''
          };
        });
        setData(updatedData);

        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          delete newGroupModified[`${item.id}_migrationDocCreation`];
          delete newGroupModified[`${item.id}_migrationEffort`];
        });
        setGroupModifiedFields(newGroupModified);
      }
    } else if (groupType === 'pglPmo') {
      setPglPmoGroupSelection(value);
      if (value) {
        const updatedData = data.map(item => ({
          ...item,
          pglSupport: value,
          pmoEffort: value
        }));
        setData(updatedData);

        // Mark these fields as group-modified for all records
        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          newGroupModified[`${item.id}_pglSupport`] = true;
          newGroupModified[`${item.id}_pmoEffort`] = true;
        });
        setGroupModifiedFields(newGroupModified);
      } else {
        // Reset field values to original and clear group-modified tracking
        const updatedData = data.map(item => {
          const original = originalData.find(orig => orig.id === item.id);
          return {
            ...item,
            pglSupport: original?.pglSupport || '',
            pmoEffort: original?.pmoEffort || ''
          };
        });
        setData(updatedData);

        const newGroupModified = { ...groupModifiedFields };
        data.forEach(item => {
          delete newGroupModified[`${item.id}_pglSupport`];
          delete newGroupModified[`${item.id}_pmoEffort`];
        });
        setGroupModifiedFields(newGroupModified);
      }
    }
  };

  const validateAndSanitizeData = (apiData, type = 'project') => {
    if (!Array.isArray(apiData)) return [];
    return apiData.map((item, index) => ({
      id: index + 1,
      ricewName: DOMPurify.sanitize(String(item.Estimation_Name || '').trim(), { ALLOWED_TAGS: [] }),
      complexity: DOMPurify.sanitize(String(item.ComplexityType || '').trim(), { ALLOWED_TAGS: [] }),
      organization_task_id: item.RICEW_Organization_Task_id || item.RICEWOrganizationTaskMapping_id || null,
      resource_task_id: item.RICEW_Resource_Task_id || null,
      estimation_model_id: item.RICEW_Estimation_Model_id || null,
      master_estimation_model_id: item.Master_RICEW_Estimation_Model_id || null,
      isActive: item.ActiveStatus === "true" || item.ActiveStatus === true,
      originalActive: item.ActiveStatus === "true" || item.ActiveStatus === true,
      fsWriting: DOMPurify.sanitize(String(item.FS_Writing || '').trim(), { ALLOWED_TAGS: [] }),
      fsReview: DOMPurify.sanitize(String(item.FS_Review || '').trim(), { ALLOWED_TAGS: [] }),
      tsWriting: DOMPurify.sanitize(String(item.TS_Writing || '').trim(), { ALLOWED_TAGS: [] }),
      tsReview: DOMPurify.sanitize(String(item.TS_Review || '').trim(), { ALLOWED_TAGS: [] }),
      codeDevlopment: DOMPurify.sanitize(String(item.Code_Development || '').trim(), { ALLOWED_TAGS: [] }),
      codeReview: DOMPurify.sanitize(String(item.Code_Review || '').trim(), { ALLOWED_TAGS: [] }),
      unitTesting: DOMPurify.sanitize(String(item.Unit_Testing || '').trim(), { ALLOWED_TAGS: [] }),
      technicalSupport: DOMPurify.sanitize(String(item.Technical_Support || '').trim(), { ALLOWED_TAGS: [] }),
      migrationDocCreation: DOMPurify.sanitize(String(item.Migration_Document_Creation || '').trim(), { ALLOWED_TAGS: [] }),
      migrationEffort: DOMPurify.sanitize(String(item.Migration_Effort || '').trim(), { ALLOWED_TAGS: [] }),
      pglSupport: DOMPurify.sanitize(String(item.PGL_Support || '').trim(), { ALLOWED_TAGS: [] }),
      pmoEffort: DOMPurify.sanitize(String(item.PMO_Effort || '').trim(), { ALLOWED_TAGS: [] }),
      projectId: projectId || selectedProject?.id || '',
      isNew: false,
      delete_status: item.delete_status || "false",
      saveDraft: item.saveDraft || "false",
      isLockedField: item.isLocked || "false"
    }));
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

  const checkUnsavedChanges = (callback) => {
    if (editingItem !== null) {
      showConfirmation(
        'You have unsaved changes. Do you want to discard them and continue?',
        () => {
          setEditingItem(null);
          setEditValues({});
          callback();
        }
      );
    } else {
      callback();
    }
  };

  const getDefaultData = () => [
    {
      id: 1,
      ricewName: 'ERP Implementation',
      complexity: 'High',
      isActive: true,
      fsWriting: 'SM',
      fsReview: 'C',
      tsWriting: 'MD',
      tsReview: 'BA',
      codeDevlopment: '60',
      codeReview: '15',
      unitTesting: '20',
      technicalSupport: '12',
      migrationDocCreation: '8',
      migrationEffort: '16',
      pglSupport: '10',
      pmoEffort: '5',
      contingency: '10',
      totalHours: '249',
      projectId: projectId || selectedProject?.id || ''
    },
    {
      id: 2,
      ricewName: 'Module Configuration',
      complexity: 'Medium',
      isActive: true,
      fsWriting: 'M',
      fsReview: 'A',
      tsWriting: 'SC',
      tsReview: 'SA',
      codeDevlopment: '30',
      codeReview: '8',
      unitTesting: '10',
      technicalSupport: '6',
      migrationDocCreation: '4',
      migrationEffort: '8',
      pglSupport: '5',
      pmoEffort: '3',
      totalHours: '126',
      projectId: projectId || selectedProject?.id || ''
    },
  ];

  // Handle Save Draft functionality
  const handleSaveDraft = () => {
    checkUnsavedChanges(async () => {
      const currentProjectId = projectId || selectedProject?.id || '';

      setSubmitValidationErrors({});

      try {
        setSavingDraft(true);

        const records = data
          .filter(item => item.organization_task_id)
          .map(item => ({
            RICEWOrganizationTaskMapping_id: item.organization_task_id,
            Code_Development: item.codeDevlopment || '',
            Code_Review: item.codeReview || '',
            FS_Review: item.fsReview || '',
            FS_Writing: item.fsWriting || '',
            Migration_Document_Creation: item.migrationDocCreation || '',
            Migration_Effort: item.migrationEffort || '',
            PGL_Support: item.pglSupport || '',
            PMO_Effort: item.pmoEffort || '',
            Technical_Support: item.technicalSupport || '',
            TS_Review: item.tsReview || '',
            TS_Writing: item.tsWriting || '',
            Unit_Testing: item.unitTesting || ''
          }));

        const payload = {
          records,
          project_id: currentProjectId.toString(),
          saveDraft: true,
          updated_by: userId || "1"
        };

        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for handleSaveDraft:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('https://dnmldjkxcg.execute-api.ap-south-1.amazonaws.com/New/ricew/orgTaskMapping/bulkUpdateWithDraft', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          setSuccessMessage(`${result.updatedRecords || 0} organization task mappings set to draft successfully!`);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);

          setChangedItems(new Set());
          setHasNewRow(false);
          setEditingFields({});
          setGroupModifiedFields({});
          setFsGroupSelection('');
          setTsGroupSelection('');
          setBuildGroupSelection('');
          setTestingGroupSelection('');
          setMigrationGroupSelection('');
          setPglPmoGroupSelection('');

          await loadData();
        } else {
          const errorData = await response.json().catch(() => ({}));
          setErrorMessage(errorData.error || 'Failed to save draft');
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
        }
      } catch (error) {
        console.error('Error saving draft:', error);
        handleAuthError(error.message);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      } finally {
        setSavingDraft(false);
      }
    });
  };

  const handleLockUnlock = () => {
    checkUnsavedChanges(async () => {
      const currentProjectId = projectId || selectedProject?.id || '';

      setSubmitValidationErrors({});

      try {
        setLockingUnlocking(true);
        const newLockedState = !isLocked;
        const payload = {
          project_id: currentProjectId.toString(),
          isLocked: newLockedState ? "true" : "false",
          updated_by: userId || "1"
        };

        console.log('Calling lock/unlock API with payload:', payload);

        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for handleLockUnlock:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('https://dnmldjkxcg.execute-api.ap-south-1.amazonaws.com/New/ricew/orgTaskMapping/updateLocked/byProject', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          console.log('Lock/unlock API call successful:', result);

          // Update local state
          setIsLocked(newLockedState);

          // Show success message
          setSuccessMessage(`Table ${newLockedState ? 'locked' : 'unlocked'} successfully!`);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to lock/unlock:', errorData);
          setErrorMessage(errorData.error || 'Failed to lock/unlock table');
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
        }
      } catch (error) {
        console.error('Error locking/unlocking:', error);
        handleAuthError(error.message);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      } finally {
        setLockingUnlocking(false);
      }
    });
  };

  const loadData = async () => {
    const currentProjectId = projectId || selectedProject?.id || '';

    setLoading(true);
    try {
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for loadData:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch(`https://dnmldjkxcg.execute-api.ap-south-1.amazonaws.com/New/ricew/orgTaskMapping/getByProject?project_id=${currentProjectId}`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched RICEW Organization Task Mapping data:', result);

        const apiData = result.success && Array.isArray(result.data) ? result.data : [];

        const transformedData = validateAndSanitizeData(apiData);

        // Check if any record has saveDraft === "true"
        const hasDraftRecords = transformedData.some(item =>
          item.saveDraft === "true" || item.saveDraft === true
        );
        setIsDraftOrganization(hasDraftRecords);

        // Check if any record has isLocked === "true"
        const isTableLocked = transformedData.some(item =>
          item.isLockedField === "true" || item.isLockedField === true
        );
        setIsLocked(isTableLocked);


        // Track which fields were originally empty
        const emptyFields = {};
        transformedData.forEach(item => {
          const fields = ['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort'];
          fields.forEach(field => {
            if (!item[field] || !item[field].trim()) {
              emptyFields[`${item.id}_${field}`] = true;
            }
          });
        });
        setOriginalEmptyFields(emptyFields);

        setData(transformedData);
        setOriginalData(transformedData.map(item => ({ ...item })));
        setIsMasterData(false);
        console.log('RICEW Organization Task Mapping data loaded successfully');
      } else {
        console.error('Failed to fetch data');
        setErrorMessage('Failed to load Organization Task Mapping data');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error fetching RICEW Organization Task Mapping data:', error);
      handleAuthError(error.message);
      setErrorMessage('Error loading Organization Task Mapping data');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationData = async (organizationId) => {
    if (!organizationId) {
      // If no organization selected, show empty table
      setData([]);
      setOriginalData([]);
      setIsMasterData(false);
      setIsLocked(false);
      console.log('No organization selected, showing empty table');
      return;
    }

    setLoading(true);
    try {
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for loadOrganizationData:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch(`https://15w4gxp10j.execute-api.ap-south-1.amazonaws.com/New/ricew/organizationTaskMapping/getByOrganization?organization_id=${organizationId}`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched organization RICEW Organization Task Mapping data:', result);

        const apiData = result.success && Array.isArray(result.data) ? result.data : [];

        if (apiData.length > 0) {
          // Organization has data - transform and display
          const transformedData = validateAndSanitizeData(apiData, 'organization');

          // Sort by RICEW_Organization_Task_id in ascending order (small numbers first)
          const sortedData = transformedData.sort((a, b) => {
            const aId = parseInt(a.organization_task_id) || 0;
            const bId = parseInt(b.organization_task_id) || 0;
            return aId - bId;
          });

          setData(sortedData);
          setOriginalData(sortedData.map(item => ({ ...item })));
          setIsMasterData(false); // Showing organization data

          // Check if any records are in draft state
          const isDraft = apiData.some(item => item.saveDraft === "true");
          setIsDraftOrganization(isDraft);

          // Check if records are locked
          const locked = apiData.length > 0 && apiData[0].isLocked === "true";
          setIsLocked(locked);

          console.log('Organization RICEW Organization Task Mapping data loaded successfully, draft status:', isDraft, 'locked status:', locked);
        } else {
          // No data found - show empty table
          console.log('No organization data found');
          setData([]);
          setOriginalData([]);
          setIsMasterData(false);
          setIsLocked(false);
        }
      } else {
        console.error('Failed to fetch organization data');
        setErrorMessage('Failed to load organization data');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error fetching organization RICEW Organization Task Mapping data:', error);
      handleAuthError(error.message);
      setErrorMessage('Error loading organization data');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLovData();
    loadData();
  }, [projectId, selectedProject?.id]);

  const loadLovData = async () => {
    try {
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for loadLovData:', tokenError);
      }

      const headers = {};
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://dnmldjkxcg.execute-api.ap-south-1.amazonaws.com/New/ricew/siOrganization/getActive', {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const options = result.data.map(item => ({
            value: item.SI_Organization_Details_id,
            label: item.SI_organization_name
          }));
          setLovData(options);
        }
      }
    } catch (error) {
      console.error('Error loading LOV data:', error);
      handleAuthError(error.message);
    }
  };

  // Helper function to get organization name from ID
  const getOrganizationNameById = (orgId) => {
    if (!orgId) return '';
    const option = lovData.find(opt => opt.value === orgId);
    return option ? option.label : orgId;
  };

  // Provide unsaved changes checker to parent component
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      // Wrap in another function to properly set state to a function value
      setUnsavedChangesChecker(() => () => {
        return hasNewRow || changedItems.size > 0 || editingItem !== null;
      });
    }
  }, [hasNewRow, changedItems, editingItem, setUnsavedChangesChecker]);

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
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showHelpPopup]);



  const loadFromLocalStorage = (storageKey) => {
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setData(parsedData);
      const hasBackendData = parsedData.some(item => item.resource_task_id !== null && item.resource_task_id !== undefined);
      setOriginalData(parsedData.map(item => ({ ...item })));
      setDataFromBackend(hasBackendData);
    } else {
      const defaultData = getDefaultData().map(item => ({ ...item, resource_task_id: null }));
      setData(defaultData);
      setDataFromBackend(false);
      localStorage.setItem(storageKey, JSON.stringify(defaultData));
    }
  };

  const saveToLocalStorage = (updatedData) => {
    const currentProjectId = projectId || selectedProject?.id || '';
    const storageKey = `ricewOrganizationTaskMappingData_${currentProjectId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
  };

  const validateRicewName = (value) => {
    return value.length >= 1 && value.length <= 100 && /^[a-zA-Z0-9\s\-_&.,()\\/]*$/.test(value);
  };

  const validateNumericField = (value) => {
    return /^\d+(\.\d{1,2})?$/.test(value) && parseFloat(value) >= 0;
  };

  const validateIntegerField = (value) => {
    return /^\d+$/.test(value) && parseInt(value) >= 0;
  };

  const calculateTotalCost = (hours, rate) => {
    const hoursNum = parseFloat(hours) || 0;
    const rateNum = parseFloat(rate) || 0;
    return (hoursNum * rateNum).toFixed(2);
  };

  const handleFieldChange = (fieldName, value, id) => {
    // Auto-capitalize based on field type
    let capitalizedValue;
    if (fieldName === 'ricewName') {
      capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'totalHours'].includes(fieldName)) {
      // Only allow numeric input for these fields
      capitalizedValue = value.replace(/[^0-9]/g, '');
    } else {
      capitalizedValue = value;
    }

    handleInlineEdit(id, fieldName, capitalizedValue);
  };

  const handleEditFieldChange = (fieldName, value) => {
    // Auto-capitalize based on field type
    let capitalizedValue;
    if (fieldName === 'ricewName') {
      capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort'].includes(fieldName)) {
      // LOV dropdown fields - use value as-is
      capitalizedValue = value;
    } else if (['codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'totalHours'].includes(fieldName)) {
      // Only allow numeric input for these fields
      capitalizedValue = value.replace(/[^0-9]/g, '');
    } else {
      capitalizedValue = value;
    }

    setEditValues({ ...editValues, [fieldName]: capitalizedValue });
  };

  const startEditingField = (itemId, fieldName) => {
    setEditingFields(prev => ({
      ...prev,
      [`${itemId}_${fieldName}`]: true
    }));

    if (isSaved) {
      setIsSaved(false);
    }
  };

  const stopEditingField = (itemId, fieldName) => {
    setEditingFields(prev => {
      const newState = { ...prev };
      delete newState[`${itemId}_${fieldName}`];
      return newState;
    });
  };

  const isFieldBeingEdited = (itemId, fieldName) => {
    return editingFields[`${itemId}_${fieldName}`] === true;
  };

  const handleInlineEdit = (id, field, value) => {
    // Restrict updates when showing master data
    if (isMasterData) {
      setErrorMessage('Cannot edit records while viewing master data. Please select an organization and copy data first.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    const item = data.find(d => d.id === id);

    // Check if item is inactive
    if (item && !item.isActive) {
      setErrorMessage('Cannot edit inactive records.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    const hasActiveEditingFields =
      isFieldBeingEdited(item.id, 'fsWriting') ||
      isFieldBeingEdited(item.id, 'fsReview') ||
      isFieldBeingEdited(item.id, 'tsWriting') ||
      isFieldBeingEdited(item.id, 'tsReview') ||
      isFieldBeingEdited(item.id, 'codeDevlopment') ||
      isFieldBeingEdited(item.id, 'codeReview') ||
      isFieldBeingEdited(item.id, 'unitTesting') ||
      isFieldBeingEdited(item.id, 'technicalSupport') ||
      isFieldBeingEdited(item.id, 'migrationDocCreation') ||
      isFieldBeingEdited(item.id, 'migrationEffort') ||
      isFieldBeingEdited(item.id, 'pglSupport') ||
      isFieldBeingEdited(item.id, 'pmoEffort');

    if (isSaved && !item.isNew && !hasActiveEditingFields) return;

    // Validate input based on field type
    if (field === 'ricewName') {
      if (!validateRicewName(value)) {
        return;
      }
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort'].includes(field)) {
      // LOV fields - no validation needed as they're dropdowns with predefined values
      // But ensure value is not empty if required
      if (!value || value.trim() === '') {
        return;
      }
    } else if (['codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'totalHours'].includes(field)) {
      if (value && !validateIntegerField(value)) {
        return;
      }
    }

    const updatedData = data.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setData(updatedData);
    saveToLocalStorage(updatedData);

    // Clear field error when user starts typing (except for limit exceeded errors)
    if (fieldErrors[`${id}_${field}`] && !fieldErrors[`${id}_${field}`].includes('Limit exceeded')) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_${field}`];
        return newErrors;
      });
    }

    // Check for limit exceeded and set error
    if (field === 'ricewName' && value.length >= 100) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}_ricewName`]: '100/100 Limit exceeded'
      }));
    } else if (field === 'ricewName' && value.length < 100 && fieldErrors[`${id}_ricewName`] === '100/100 Limit exceeded') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_ricewName`];
        return newErrors;
      });
    }

    if (field === 'description' && value.length >= 240) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}_description`]: '240/240 Limit exceeded'
      }));
    } else if (field === 'description' && value.length < 240 && fieldErrors[`${id}_description`] === '240/240 Limit exceeded') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_description`];
        return newErrors;
      });
    }

    // Compare with original data to determine if there are actual changes
    const originalItem = originalData.find(orig => orig.id === id);
    const hasChanged = !originalItem || originalItem[field] !== value;

    setChangedItems(prev => {
      const newSet = new Set(prev);
      if (hasChanged) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleEdit = (id) => {
    // Restrict updates when showing master data
    if (isMasterData) {
      setErrorMessage('Cannot edit records while viewing master data. Please select an organization and copy data first.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    const item = data.find(d => d.id === id);
    if (item && !item.isActive) {
      setErrorMessage('Cannot edit inactive records.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }
    if (item) {
      // Check if another item is already being edited
      if (editingItem !== null && editingItem !== id) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
            // User confirmed, proceed to edit the new item
            setIsSaved(false);
            setEditingItem(id);
            setEditValues({
              isActive: item.isActive,
              fsWriting: item.fsWriting,
              fsReview: item.fsReview,
              tsWriting: item.tsWriting,
              tsReview: item.tsReview,
              codeDevlopment: item.codeDevlopment,
              codeReview: item.codeReview,
              unitTesting: item.unitTesting,
              technicalSupport: item.technicalSupport,
              migrationDocCreation: item.migrationDocCreation,
              migrationEffort: item.migrationEffort,
              pglSupport: item.pglSupport,
              pmoEffort: item.pmoEffort
            });
            setShowAddForm(false);

            // Auto-scroll to show the edited row
            setTimeout(() => {
              const editedRow = document.querySelector(`tr[data-row-id="${id}"]`);
              if (editedRow) {
                editedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }
        );
      } else if (hasNewRow) {
        // Check if there's an unsaved new row
        showConfirmation(
          'You have unsaved changes. Do you want to continue?',
          () => {
            // User clicked Yes - discard the unsaved row and proceed with edit
            const savedData = data.filter(row => !row.isNew);
            setData(savedData);
            setHasNewRow(false);
            setChangedItems(new Set());

            // Now set the edit mode
            setIsSaved(false);
            setEditingItem(id);
            setEditValues({
              fsWriting: item.fsWriting,
              fsReview: item.fsReview,
              tsWriting: item.tsWriting,
              tsReview: item.tsReview,
              codeDevlopment: item.codeDevlopment,
              codeReview: item.codeReview,
              unitTesting: item.unitTesting,
              technicalSupport: item.technicalSupport,
              migrationDocCreation: item.migrationDocCreation,
              migrationEffort: item.migrationEffort,
              pglSupport: item.pglSupport,
              pmoEffort: item.pmoEffort
            });
            setShowAddForm(false);

            // Auto-scroll to show the edited row
            setTimeout(() => {
              const editedRow = document.querySelector(`tr[data-row-id="${id}"]`);
              if (editedRow) {
                editedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }
        );
      } else {
        // No unsaved changes, proceed normally
        setIsSaved(false);
        setEditingItem(id);
        setEditValues({
          fsWriting: item.fsWriting,
          fsReview: item.fsReview,
          tsWriting: item.tsWriting,
          tsReview: item.tsReview,
          codeDevlopment: item.codeDevlopment,
          codeReview: item.codeReview,
          unitTesting: item.unitTesting,
          technicalSupport: item.technicalSupport,
          migrationDocCreation: item.migrationDocCreation,
          migrationEffort: item.migrationEffort,
          pglSupport: item.pglSupport,
          pmoEffort: item.pmoEffort
        });
        setShowAddForm(false);

        // Auto-scroll to show the edited row
        setTimeout(() => {
          const editedRow = document.querySelector(`tr[data-row-id="${id}"]`);
          if (editedRow) {
            editedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  };

  const handleSaveEdit = async (id) => {
    // Restrict updates when showing master data
    if (isMasterData) {
      setErrorMessage('Cannot edit records while viewing master data.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }
    try {
      const item = data.find(d => d.id === id);

      const payload = {
        RICEWOrganizationTaskMapping_id: item.organization_task_id,
        FS_Writing: editValues.fsWriting,
        FS_Review: editValues.fsReview,
        TS_Writing: editValues.tsWriting,
        TS_Review: editValues.tsReview,
        Code_Development: editValues.codeDevlopment,
        Code_Review: editValues.codeReview,
        Unit_Testing: editValues.unitTesting,
        Technical_Support: editValues.technicalSupport,
        Migration_Document_Creation: editValues.migrationDocCreation,
        Migration_Effort: editValues.migrationEffort,
        PGL_Support: editValues.pglSupport,
        PMO_Effort: editValues.pmoEffort,
        updated_by: userId || "1"
      };

      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for handleSaveEdit:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://dnmldjkxcg.execute-api.ap-south-1.amazonaws.com/New/ricew/orgTaskMapping/update', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        setEditingItem(null);
        setEditValues({});
        setEditingFields({});

        setSuccessMessage('Organization task mapping updated successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        await loadData();
      } else {
        setErrorMessage('Failed to update organization task mapping. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      handleAuthError(error.message);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    }
  };



  const handleSubmit = () => {
    checkUnsavedChanges(async () => {
      const currentProjectId = projectId || selectedProject?.id || '';

      // Validate all fields are filled
      const validationErrors = {};
      const requiredFields = ['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort'];

      data.forEach(item => {
        if (item.organization_task_id) {
          requiredFields.forEach(field => {
            if (!item[field] || !item[field].trim()) {
              validationErrors[`${item.id}_${field}`] = true;
            }
          });
        }
      });

      if (Object.keys(validationErrors).length > 0) {
        setSubmitValidationErrors(validationErrors);
        setErrorMessage('Please fill all required fields before submitting.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return;
      }

      setSubmitValidationErrors({});

      try {
        setSavingDraft(true);

        const records = data
          .filter(item => item.organization_task_id)
          .map(item => ({
            RICEWOrganizationTaskMapping_id: item.organization_task_id,
            Code_Development: item.codeDevlopment || '',
            Code_Review: item.codeReview || '',
            FS_Review: item.fsReview || '',
            FS_Writing: item.fsWriting || '',
            Migration_Document_Creation: item.migrationDocCreation || '',
            Migration_Effort: item.migrationEffort || '',
            PGL_Support: item.pglSupport || '',
            PMO_Effort: item.pmoEffort || '',
            Technical_Support: item.technicalSupport || '',
            TS_Review: item.tsReview || '',
            TS_Writing: item.tsWriting || '',
            Unit_Testing: item.unitTesting || ''
          }));

        const payload = {
          records,
          project_id: currentProjectId.toString(),
          saveDraft: false,
          updated_by: userId || "1"
        };

        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for submit:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('https://dnmldjkxcg.execute-api.ap-south-1.amazonaws.com/New/ricew/orgTaskMapping/bulkUpdateWithDraft', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          setSuccessMessage(`${result.updatedRecords || 0} organization task mappings finalized successfully!`);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);

          setChangedItems(new Set());
          setHasNewRow(false);
          setEditingFields({});
          setGroupModifiedFields({});
          setFsGroupSelection('');
          setTsGroupSelection('');
          setBuildGroupSelection('');
          setTestingGroupSelection('');
          setMigrationGroupSelection('');
          setPglPmoGroupSelection('');

          await loadData();
        } else {
          const errorData = await response.json().catch(() => ({}));
          setErrorMessage(errorData.error || 'Failed to submit');
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
        }
      } catch (error) {
        console.error('Error submitting:', error);
        handleAuthError(error.message);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      } finally {
        setSavingDraft(false);
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
  };

  return (
    <>
    <div className="config-main" style={{ minHeight: '80vh' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#2563eb' }}>{projectName || selectedProject?.name || ''}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '150px', justifyContent: 'flex-start' }}>
        <h2>RICEW Organization Task Mapping</h2>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          <button
            onClick={() => setShowHelpPopup(!showHelpPopup)}
            style={{
              backgroundColor: 'transparent',
              color: 'black',
              border: '1px solid black',
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
            onMouseEnter={(e) => e.target.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#F8F9FA'}
          >
            <HelpCircle size={16} />
            Help
          </button>
          {showHelpPopup && (
            <div ref={helpPopupRef} style={{
              position: 'absolute',
              top: '100%',
              right: '-10px',
              marginTop: '10px',
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              width: '400px',
              zIndex: 3000,
              border: '1px solid #eee'
            }}>
              {/* Tooltip Arrow */}
              <div style={{
                position: 'absolute',
                top: '-6px',
                right: '20px',
                width: '12px',
                height: '12px',
                backgroundColor: 'white',
                transform: 'rotate(45deg)',
                borderLeft: '1px solid #eee',
                borderTop: '1px solid #eee'
              }}></div>

              <button
                onClick={() => setShowHelpPopup(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666'
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
              <ul style={{
                margin: '0',
                paddingLeft: '20px',
                color: '#666',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                <li>Assign tasks to the correct organization for each RICEW item.</li>
                <li>Verify that the assigned organization has the necessary resources.</li>
                <li>Ensure all critical tasks are covered by an active organization.</li>
                <li>Save changes frequently to avoid losing data.</li>
                <li>Contact the administrator if you need to add new organizations.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {(loading || lockingUnlocking || savingDraft) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            minWidth: '200px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ fontSize: '15px', color: '#4b5563', fontWeight: '500' }}>
              {lockingUnlocking ? (isLocked ? 'Unlocking...' : 'Locking...') : 
               savingDraft ? 'Processing...' : 'Loading Data...'}
            </span>
          </div>
        </div>
      )}

      {/* Success Message Popup */}
      {showSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: 'white',
          borderLeft: '4px solid #10b981',
          color: '#1f2937',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', padding: '4px' }}>
            <Save size={16} />
          </div>
          <span style={{ fontWeight: '500' }}>{DOMPurify.sanitize(successMessage, { ALLOWED_TAGS: [] })}</span>
        </div>
      )}

      {/* Error Message Popup */}
      {showErrorMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: 'white',
          borderLeft: '4px solid #ef4444',
          color: '#1f2937',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', padding: '4px' }}>
            <X size={16} />
          </div>
          <span style={{ fontWeight: '500' }}>{DOMPurify.sanitize(errorMessage, { ALLOWED_TAGS: [] })}</span>
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .config-table thead tr:first-child th[colspan] {
          position: relative;
        }

        .config-table thead tr:first-child th[colspan]::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #999;
          z-index: 1;
        }
      `}</style>

      {/* Draft Status Banner */}
      {isDraftOrganization && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          padding: '12px 16px',
          margin: '16px 16px 0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            backgroundColor: '#f59e0b',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            ⓘ
          </div>
          <div style={{
            color: '#92400e',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            This is a saved draft Organization. Complete the form and click "Submit" to finalize the Organization.
          </div>
        </div>
      )}

      <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto', position: 'relative', marginTop: isDraftOrganization ? '16px' : '0' }}>
        <table className="config-table" style={{ fontSize: '15px', borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#fff' }}>
            {/* Row 1: Organization Dropdowns */}
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th rowSpan="3" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '12%', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}></th>
              <th rowSpan="3" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '8%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Complexity</th>
              <th rowSpan="3" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '3%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Active</th>
              <th colSpan="2" style={{ padding: '6px 12px', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>
                <Select
                  value={fsGroupSelection}
                  onChange={(e) => handleGroupSelection('fs', e.target.value)}
                  size="small"
                  disabled={isLocked}
                  style={{ width: '100%', fontSize: '13px', backgroundColor: 'white' }}
                  displayEmpty
                >
                  <MenuItem value="">Select Organization</MenuItem>
                  {lovData.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      sx={{
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: '#cce5ff',
                        },
                        '&.Mui-selected': {
                          backgroundColor: '#e3f2fd',
                          '&:hover': {
                            backgroundColor: '#cce5ff',
                          },
                        },
                        '&.Mui-focusVisible': {
                          backgroundColor: '#cce5ff',
                        },
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </th>
              <th colSpan="2" style={{ padding: '6px 12px', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>
                <Select
                  value={tsGroupSelection}
                  onChange={(e) => handleGroupSelection('ts', e.target.value)}
                  size="small"
                  disabled={isLocked}
                  style={{ width: '100%', fontSize: '13px', backgroundColor: 'white' }}
                  displayEmpty
                >
                  <MenuItem value="">Select Organization</MenuItem>
                  {lovData.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      sx={{
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: '#cce5ff',
                        },
                        '&.Mui-selected': {
                          backgroundColor: '#e3f2fd',
                          '&:hover': {
                            backgroundColor: '#cce5ff',
                          },
                        },
                        '&.Mui-focusVisible': {
                          backgroundColor: '#cce5ff',
                        },
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </th>
              <th colSpan="2" style={{ padding: '6px 12px', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>
                <Select
                  value={buildGroupSelection}
                  onChange={(e) => handleGroupSelection('build', e.target.value)}
                  size="small"
                  disabled={isLocked}
                  style={{ width: '100%', fontSize: '13px', backgroundColor: 'white' }}
                  displayEmpty
                >
                  <MenuItem value="">Select Organization</MenuItem>
                  {lovData.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      sx={{
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: '#cce5ff',
                        },
                        '&.Mui-selected': {
                          backgroundColor: '#e3f2fd',
                          '&:hover': {
                            backgroundColor: '#cce5ff',
                          },
                        },
                        '&.Mui-focusVisible': {
                          backgroundColor: '#cce5ff',
                        },
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </th>
              <th colSpan="2" style={{ padding: '6px 12px', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>
                <Select
                  value={testingGroupSelection}
                  onChange={(e) => handleGroupSelection('testing', e.target.value)}
                  size="small"
                  disabled={isLocked}
                  style={{ width: '100%', fontSize: '13px', backgroundColor: 'white' }}
                  displayEmpty
                >
                  <MenuItem value="">Select Organization</MenuItem>
                  {lovData.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      sx={{
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: '#cce5ff',
                        },
                        '&.Mui-selected': {
                          backgroundColor: '#e3f2fd',
                          '&:hover': {
                            backgroundColor: '#cce5ff',
                          },
                        },
                        '&.Mui-focusVisible': {
                          backgroundColor: '#cce5ff',
                        },
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </th>
              <th colSpan="2" style={{ padding: '6px 12px', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>
                <Select
                  value={migrationGroupSelection}
                  onChange={(e) => handleGroupSelection('migration', e.target.value)}
                  size="small"
                  disabled={isLocked}
                  style={{ width: '100%', fontSize: '13px', backgroundColor: 'white' }}
                  displayEmpty
                >
                  <MenuItem value="">Select Organization</MenuItem>
                  {lovData.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      sx={{
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: '#cce5ff',
                        },
                        '&.Mui-selected': {
                          backgroundColor: '#e3f2fd',
                          '&:hover': {
                            backgroundColor: '#cce5ff',
                          },
                        },
                        '&.Mui-focusVisible': {
                          backgroundColor: '#cce5ff',
                        },
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </th>
              <th colSpan="2" style={{ padding: '6px 12px', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>
                <Select
                  value={pglPmoGroupSelection}
                  onChange={(e) => handleGroupSelection('pglPmo', e.target.value)}
                  size="small"
                  disabled={isLocked}
                  style={{ width: '100%', fontSize: '13px', backgroundColor: 'white' }}
                  displayEmpty
                >
                  <MenuItem value="">Select Organization</MenuItem>
                  {lovData.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      sx={{
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: '#cce5ff',
                        },
                        '&.Mui-selected': {
                          backgroundColor: '#e3f2fd',
                          '&:hover': {
                            backgroundColor: '#cce5ff',
                          },
                        },
                        '&.Mui-focusVisible': {
                          backgroundColor: '#cce5ff',
                        },
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </th>
              <th rowSpan="3" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '3%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Edit</th>
            </tr>
            {/* Row 2: Main Headers */}
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Functional Specifications (FS)</th>
              <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Technical Specification (TS)</th>
              <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Build</th>
              <th colSpan="1" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Code Testing</th>
              <th colSpan="1" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>SIT / INT / UAT</th>
              <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Migration</th>
              <th colSpan="1" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Post Go-Live Support (PGL)</th>
              <th colSpan="1" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Delivery PMO</th>
            </tr>
            {/* Row 3: Sub-headers */}
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>FS Writing</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>FS Review</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>TS Writing</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>TS Review</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Code Development</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Code Review</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Unit Testing</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Technical Support</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Migration Document Creation</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Migration Effort</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>PGL Support</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>PMO Effort</th>
            </tr>
          </thead>
          <tbody>
            {useMemo(() => {
              const sortedData = [...data].sort((a, b) => {
                // Always put new items at the bottom
                if (a.isNew && !b.isNew) return 1;
                if (!a.isNew && b.isNew) return -1;

                // For existing items, sort by resource_task_id ascending
                const aId = parseInt(a.resource_task_id) || 0;
                const bId = parseInt(b.resource_task_id) || 0;
                if (aId !== bId) {
                  return aId - bId;
                }

                // If same resource_task_id, maintain original order
                return 0;
              });

              // Calculate rowSpan for each ricewName group
              const groupInfo = {};
              sortedData.forEach((item, index) => {
                if (index === 0 || sortedData[index - 1].ricewName !== item.ricewName) {
                  // Start of a new group
                  let count = 1;
                  for (let i = index + 1; i < sortedData.length; i++) {
                    if (sortedData[i].ricewName === item.ricewName) {
                      count++;
                    } else {
                      break;
                    }
                  }
                  groupInfo[index] = count;
                }
              });

              return sortedData.map((item, index) => (
                <tr key={item.id} data-row-id={item.id} style={{
                  backgroundColor: isLocked ? '#f5f5f5' : (item.isActive ? '#fff' : '#f8f8f8'),
                  borderBottom: '1px solid #ddd'
                }}>

                  {groupInfo[index] && (
                    <td rowSpan={groupInfo[index]} style={{
                      padding: '8px 12px',
                      verticalAlign: 'middle',
                      border: '1px solid #ddd',
                      textAlign: 'left',
                      backgroundColor: (() => {
                        // Check if all items in this group are inactive
                        const groupRicewName = item.ricewName;
                        const groupItems = sortedData.filter(dataItem => dataItem.ricewName === groupRicewName);
                        const allInactive = groupItems.every(dataItem => !dataItem.isActive);
                        return allInactive ? '#f8f8f8' : '#fff';
                      })(),
                      opacity: (() => {
                        // Check if all items in this group are inactive
                        const groupRicewName = item.ricewName;
                        const groupItems = sortedData.filter(dataItem => dataItem.ricewName === groupRicewName);
                        const allInactive = groupItems.every(dataItem => !dataItem.isActive);
                        return allInactive ? 0.6 : 1;
                      })()
                    }}>
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {item.ricewName}
                      </div>
                    </td>
                  )}
                  <td style={{
                    padding: '8px 12px',
                    verticalAlign: 'middle',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    <div style={{
                      fontSize: '14px',
                      padding: '8px 0',
                      color: '#333',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.complexity}
                    </div>
                  </td>
                  <td style={{
                    padding: '8px 12px',
                    verticalAlign: 'middle',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    <div
                      key={`active-${item.id}-${item.isActive}`}
                      style={{
                        width: '16px',
                        height: '16px',
                        border: `2px solid ${item.isActive ? '#9ca3af' : '#6b7280'}`,
                        borderRadius: '3px',
                        backgroundColor: item.isActive ? '#9ca3af' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'not-allowed',
                        margin: '0 auto'
                      }}
                    >
                      {item.isActive && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                      )}
                    </div>
                  </td>
                  {/* FS Writing */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'fsWriting') || !item.fsWriting || !item.fsWriting.trim() || groupModifiedFields[`${item.id}_fsWriting`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.fsWriting : item.fsWriting || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'fsWriting');
                            }
                            editingItem === item.id ? handleEditFieldChange('fsWriting', e.target.value) : handleFieldChange('fsWriting', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_fsWriting`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'fsWriting');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_fsWriting`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.fsWriting)}
                      </div>
                    )}
                  </td>
                  {/* FS Review */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'fsReview') || !item.fsReview || !item.fsReview.trim() || groupModifiedFields[`${item.id}_fsReview`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.fsReview : item.fsReview || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'fsReview');
                            }
                            editingItem === item.id ? handleEditFieldChange('fsReview', e.target.value) : handleFieldChange('fsReview', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_fsReview`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'fsReview');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_fsReview`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.fsReview)}
                      </div>
                    )}
                  </td>
                  {/* TS Writing */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'tsWriting') || !item.tsWriting || !item.tsWriting.trim() || groupModifiedFields[`${item.id}_tsWriting`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.tsWriting : item.tsWriting || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'tsWriting');
                            }
                            editingItem === item.id ? handleEditFieldChange('tsWriting', e.target.value) : handleFieldChange('tsWriting', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_tsWriting`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'tsWriting');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_tsWriting`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.tsWriting)}
                      </div>
                    )}
                  </td>
                  {/* TS Review */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'tsReview') || !item.tsReview || !item.tsReview.trim() || groupModifiedFields[`${item.id}_tsReview`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.tsReview : item.tsReview || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'tsReview');
                            }
                            editingItem === item.id ? handleEditFieldChange('tsReview', e.target.value) : handleFieldChange('tsReview', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_tsReview`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'tsReview');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_tsReview`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.tsReview)}
                      </div>
                    )}
                  </td>
                  {/* Code Development */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'codeDevlopment') || !item.codeDevlopment || !item.codeDevlopment.trim() || groupModifiedFields[`${item.id}_codeDevlopment`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.codeDevlopment : item.codeDevlopment || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'codeDevlopment');
                            }
                            editingItem === item.id ? handleEditFieldChange('codeDevlopment', e.target.value) : handleFieldChange('codeDevlopment', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_codeDevlopment`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'codeDevlopment');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_codeDevlopment`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.codeDevlopment)}
                      </div>
                    )}
                  </td>
                  {/* Code Review */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'codeReview') || !item.codeReview || !item.codeReview.trim() || groupModifiedFields[`${item.id}_codeReview`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.codeReview : item.codeReview || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'codeReview');
                            }
                            editingItem === item.id ? handleEditFieldChange('codeReview', e.target.value) : handleFieldChange('codeReview', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_codeReview`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'codeReview');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_codeReview`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.codeReview)}
                      </div>
                    )}
                  </td>
                  {/* Unit Testing */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'unitTesting') || !item.unitTesting || !item.unitTesting.trim() || groupModifiedFields[`${item.id}_unitTesting`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.unitTesting : item.unitTesting || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'unitTesting');
                            }
                            editingItem === item.id ? handleEditFieldChange('unitTesting', e.target.value) : handleFieldChange('unitTesting', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_unitTesting`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'unitTesting');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_unitTesting`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.unitTesting)}
                      </div>
                    )}
                  </td>
                  {/* Technical Support */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'technicalSupport') || !item.technicalSupport || !item.technicalSupport.trim() || groupModifiedFields[`${item.id}_technicalSupport`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.technicalSupport : item.technicalSupport || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'technicalSupport');
                            }
                            editingItem === item.id ? handleEditFieldChange('technicalSupport', e.target.value) : handleFieldChange('technicalSupport', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_technicalSupport`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'technicalSupport');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_technicalSupport`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.technicalSupport)}
                      </div>
                    )}
                  </td>
                  {/* Migration Document Creation */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'migrationDocCreation') || !item.migrationDocCreation || !item.migrationDocCreation.trim() || groupModifiedFields[`${item.id}_migrationDocCreation`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.migrationDocCreation : item.migrationDocCreation || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'migrationDocCreation');
                            }
                            editingItem === item.id ? handleEditFieldChange('migrationDocCreation', e.target.value) : handleFieldChange('migrationDocCreation', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_migrationDocCreation`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'migrationDocCreation');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_migrationDocCreation`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.migrationDocCreation)}
                      </div>
                    )}
                  </td>
                  {/* Migration Effort */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'migrationEffort') || !item.migrationEffort || !item.migrationEffort.trim() || groupModifiedFields[`${item.id}_migrationEffort`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.migrationEffort : item.migrationEffort || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'migrationEffort');
                            }
                            editingItem === item.id ? handleEditFieldChange('migrationEffort', e.target.value) : handleFieldChange('migrationEffort', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_migrationEffort`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'migrationEffort');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_migrationEffort`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.migrationEffort)}
                      </div>
                    )}
                  </td>
                  {/* PGL Support */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'pglSupport') || !item.pglSupport || !item.pglSupport.trim() || groupModifiedFields[`${item.id}_pglSupport`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.pglSupport : item.pglSupport || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'pglSupport');
                            }
                            editingItem === item.id ? handleEditFieldChange('pglSupport', e.target.value) : handleFieldChange('pglSupport', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_pglSupport`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'pglSupport');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_pglSupport`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.pglSupport)}
                      </div>
                    )}
                  </td>
                  {/* PMO Effort */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {(editingItem === item.id || !item.organization_task_id || isFieldBeingEdited(item.id, 'pmoEffort') || !item.pmoEffort || !item.pmoEffort.trim() || groupModifiedFields[`${item.id}_pmoEffort`]) ? (
                      <div>
                        <Select
                          value={editingItem === item.id ? editValues.pmoEffort : item.pmoEffort || ''}
                          onChange={(e) => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'pmoEffort');
                            }
                            editingItem === item.id ? handleEditFieldChange('pmoEffort', e.target.value) : handleFieldChange('pmoEffort', e.target.value, item.id);
                            setSubmitValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`${item.id}_pmoEffort`];
                              return newErrors;
                            });
                          }}
                          onFocus={() => {
                            if (item.organization_task_id && editingItem !== item.id) {
                              startEditingField(item.id, 'pmoEffort');
                            }
                          }}
                          size="small"
                          disabled={isLocked}
                          style={{ width: '100%', fontSize: '14px' }}
                          displayEmpty
                          MenuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left',
                            },
                            PaperProps: {
                              style: {
                                maxHeight: 180,
                                maxWidth: 150,
                                overflow: 'auto',
                              },
                            },
                          }}
                        >
                          {lovData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{
                                fontSize: '13px',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#cce5ff',
                                  },
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: '#cce5ff',
                                },
                              }}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {submitValidationErrors[`${item.id}_pmoEffort`] && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>Required</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {getOrganizationNameById(item.pmoEffort)}
                      </div>
                    )}
                  </td>
                  {/* Actions */}
                  <td style={{
                    padding: '6px 4px',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
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
                      ) : item.organization_task_id && item.isActive &&
                      item.fsWriting && item.fsReview && item.tsWriting && item.tsReview &&
                      item.codeDevlopment && item.codeReview && item.unitTesting && item.technicalSupport &&
                      item.migrationDocCreation && item.migrationEffort && item.pglSupport && item.pmoEffort && (
                        <button
                          className="action-btn menu-btn"
                          disabled={isMasterData || isLocked}
                          onClick={() => handleEdit(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: (isMasterData || isLocked) ? 'not-allowed' : 'pointer',
                            color: (isMasterData || isLocked) ? '#ccc' : '#6b7280',
                            padding: '4px'
                          }}
                          title={isMasterData ? "Actions disabled while viewing master data" : isLocked ? "Cannot edit locked records" : "Edit"}
                        >
                          <MoreVertical size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ));
            }, [data, editingItem, editValues, isLocked, isMasterData, editingFields, groupModifiedFields, submitValidationErrors])}
          </tbody>
        </table>
      </div>

      <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', marginLeft: '16px' }}>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={savingDraft || isLocked}
          style={{
            padding: '00px 24px',
            backgroundColor: (savingDraft || isLocked) ? '#6c757d' : '#3b82f6',
            color: 'white',
            border: 'none',
            height: "32px",
            borderRadius: '4px',
            width: "140px",
            cursor: (savingDraft || isLocked) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: (savingDraft || isLocked) ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { if (!savingDraft && !isLocked) e.target.style.backgroundColor = '#2563eb'; }}
          onMouseLeave={(e) => { if (!savingDraft && !isLocked) e.target.style.backgroundColor = '#3b82f6'; }}
        >
          {savingDraft ? 'Saving Draft...' : 'Save Draft'}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={savingDraft || isLocked}
          style={{
            padding: '00px 24px',
            backgroundColor: (savingDraft || isLocked) ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            height: "32px",
            borderRadius: '4px',
            width: "140px",
            cursor: (savingDraft || isLocked) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: (savingDraft || isLocked) ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => !savingDraft && !isLocked && (e.target.style.backgroundColor = '#218838')}
          onMouseLeave={(e) => !savingDraft && !isLocked && (e.target.style.backgroundColor = '#28a745')}
        >
          {savingDraft ? 'Submitting...' : 'Submit'}
        </button>
        <button
          onClick={handleLockUnlock}
          disabled={savingDraft || isMasterData || lockingUnlocking}
          style={{
            backgroundColor: isLocked ? '#dc3545' : '#17a2b8',
            color: 'white',
            border: 'none',
            height: '32px',
            width: "140px",
            padding: '0px 12px',
            borderRadius: '4px',
            cursor: (savingDraft || isMasterData || lockingUnlocking) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (savingDraft || isMasterData || lockingUnlocking) ? 0.6 : 1,
            transition: 'all 0.2s',
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => {
            if (!savingDraft && !isMasterData && !lockingUnlocking) {
              e.target.style.backgroundColor = isLocked ? '#c82333' : '#156a8a';
            }
          }}
          onMouseLeave={(e) => {
            if (!savingDraft && !isMasterData && !lockingUnlocking) {
              e.target.style.backgroundColor = isLocked ? '#dc3545' : '#17a2b8';
            }
          }}
          title={isLocked ? 'Unlock editing' : 'Lock editing'}
        >
          {lockingUnlocking ? (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid white',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          ) : (
            <>{isLocked ? <Unlock size={16} /> : <Lock size={16} />}</>
          )}
          {lockingUnlocking ? (isLocked ? 'Unlocking...' : 'Locking...') : (isLocked ? 'Unlock' : 'Lock')}
        </button>
      </div>

      <div style={{ height: '70px' }}></div>
    </div>
      <SessionExpiredPopup />
    </>
  );
};

export default RicewOrganizationTaskMapping;
