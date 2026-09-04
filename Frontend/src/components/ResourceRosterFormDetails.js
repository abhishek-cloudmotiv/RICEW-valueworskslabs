import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSession } from '../context/SessionContext';
import useLOV from '../hooks/useLOV';
import { OrganizationAutocomplete, FullNameAutocomplete, PhoneCodeAutocomplete, EmploymentTypeAutocomplete, WorkLocationAutocomplete, NationalityAutocomplete, ProcessStreamAutocomplete, ApplicationAutocomplete, WorkArrangementAutocomplete, BillabilityStatusAutocomplete, OnboardingStatusAutocomplete, ResourceLevelAutocomplete, PrimaryRoleAutocomplete, ServiceLineAutocomplete, BusinessLineAutocomplete } from './Resource Roster Form/AutocompleteComponents';
import { CustomDatePicker } from './Resource Roster Form/Components';
import { IdentificationContactSection, EngagementRoleSection, StaffingAllocationSection, BillingCommercialsSection, SuccessMessage, ErrorMessage } from './Resource Roster Form/FormSections';
import { mapApiResponseToFormData, defaultFormData } from './Resource Roster Form/Utils';
import { getIdToken } from '../utils/cognito-auth';
import { HelpCircle, X } from 'lucide-react';

// Helper for retrying fetches with exponential backoff
const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 1000) => {
  try {
    const response = await fetch(url, options);
    // If status is 5xx or 429, throw to trigger retry. 
    // We don't retry 4xx (client errors) except 429 (Too Many Requests)
    if (!response.ok && (response.status >= 500 || response.status === 429)) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
};

const ResourceRosterFormDetails = ({
  onClose,
  onBackToLanding,
  onBackToList,
  onLogout,
  selectedProject
}) => {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const { handleAuthError } = useSession();

  const [formData, setFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrorMessage, setValidationErrorMessage] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [inputErrors, setInputErrors] = useState({});
  const [dateValidationErrors, setDateValidationErrors] = useState({});
  const lastToastShownRef = useRef('');

  // Confirmation dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Track the currently loaded record ID (may be different from URL formId when switching records)
  const [currentRecordId, setCurrentRecordId] = useState(null);

  // Track if current record is a draft loaded from draft API (not from URL)
  const [isDraftFromAPI, setIsDraftFromAPI] = useState(false);

  // Track if current record is a draft (from either API or regular edit)
  const [isDraft, setIsDraft] = useState(false);

  // Track if user switched records while in draft-from-API mode
  const [switchedFromDraft, setSwitchedFromDraft] = useState(false);

  // States for duplicate email validation
  const [existingEmails, setExistingEmails] = useState([]);
  const [originalEmail, setOriginalEmail] = useState('');

  // State for process streams data
  const [processStreamsData, setProcessStreamsData] = useState([]);
  const [orgServiceData, setOrgServiceData] = useState([]);
  const [orgBusinessLineData, setOrgBusinessLineData] = useState([]);
  const [orgPortfolioData, setOrgPortfolioData] = useState([]);

  const clearFieldError = (fieldName) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  };

  const clearDateValidationError = (fieldName) => {
    setDateValidationErrors(prev => ({
      ...prev,
      [fieldName]: undefined
    }));
  };

  const handleInputError = (fieldName, error) => {
    setInputErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const validateDateRelationships = (updatedFormData) => {
    const newDateErrors = {};

    // End Date validation - cannot be less than Start Date
    if (updatedFormData.startDate && updatedFormData.endDate) {
      const startDate = new Date(updatedFormData.startDate);
      const endDate = new Date(updatedFormData.endDate);
      if (endDate < startDate) {
        newDateErrors.endDate = 'End date cannot be less than start date';
      }
    }

    // Billing Start Date validation - cannot be less than Start Date
    if (updatedFormData.startDate && updatedFormData.billingStartDate) {
      const startDate = new Date(updatedFormData.startDate);
      const billingStartDate = new Date(updatedFormData.billingStartDate);
      if (billingStartDate < startDate) {
        newDateErrors.billingStartDate = 'Billing start date cannot be less than start date';
      }
    }

    // Show toast message only when errors first appear
    const currentErrorKey = Object.keys(newDateErrors).sort().join(',');
    const previousErrorKey = lastToastShownRef.current;

    if (currentErrorKey && currentErrorKey !== previousErrorKey) {
      // New errors appeared - show toast
      const firstError = Object.values(newDateErrors)[0];
      const sanitizedError = DOMPurify.sanitize(firstError, { ALLOWED_TAGS: [] });
      setValidationErrorMessage(sanitizedError);
      setShowValidationError(true);
      setTimeout(() => {
        setShowValidationError(false);
        setValidationErrorMessage('');
      }, 5000);
      lastToastShownRef.current = currentErrorKey;
    } else if (!currentErrorKey) {
      // No errors - reset the ref
      lastToastShownRef.current = '';
    }

    setDateValidationErrors(newDateErrors);
  };

  useEffect(() => {
    const loadAllData = async () => {
      // Helper delay function
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const fetchProcessStreams = async () => {
        try {
          // Get ID token for authorization
          let idToken = null;
          try {
            idToken = await getIdToken();
          } catch (tokenError) {
            console.error('Failed to get ID token for process streams:', tokenError);
          }

          const headers = { 'Content-Type': 'application/json' };
          if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

          const response = await fetchWithRetry('https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/oracleApplicationProcessStream', { headers });
          if (response.status === 401 || response.status === 403) {
            handleAuthError('Session expired - please login again');
            return;
          }
          if (response.ok) {
            const result = await response.json();
            const apiData = result.data || [];

            // Sort by sequence_number
            const sortedData = [...apiData].sort((a, b) => a.sequence_number - b.sequence_number);

            // Extract unique Oracle_Application_Suite (Process Stream) and their Process_Stream (Applications)
            const streamMap = {};
            sortedData.forEach(item => {
              if (!streamMap[item.Oracle_Application_Suite]) {
                streamMap[item.Oracle_Application_Suite] = {
                  stream_name: item.Oracle_Application_Suite,
                  applications: []
                };
              }
              // Add Process_Stream as application if not already present
              if (!streamMap[item.Oracle_Application_Suite].applications.some(app => app.app_name === item.Process_Stream)) {
                streamMap[item.Oracle_Application_Suite].applications.push({
                  app_name: item.Process_Stream
                });
              }
            });

            // Convert to array maintaining order from sortedData
            const transformedData = Object.values(streamMap);
            setProcessStreamsData(transformedData);
          }
        } catch (error) {
          console.error('Error fetching process streams:', error);
        }
      };

      const fetchOrgServiceDetails = async () => {
        try {
          const idToken = await getIdToken();
          const pid = localStorage.getItem('project_id') || selectedProject?.id || '101';
          const response = await fetchWithRetry(`https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/ricew/LOV/org-service-details?project_id=${pid}`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (response.status === 401 || response.status === 403) {
            handleAuthError('Session expired - please login again');
            return;
          }
          if (response.ok) {
            const result = await response.json();
            if (result.success) setOrgServiceData(result.data);
          }
        } catch (error) {
          console.error('Error fetching org-service details:', error);
        }
      };

      const fetchOrgBusinessLines = async () => {
        try {
          const idToken = await getIdToken();
          const pid = localStorage.getItem('project_id') || selectedProject?.id || '101';
          const response = await fetchWithRetry(`https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/ricew/LOV/org-business-lines?project_id=${pid}`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (response.status === 401 || response.status === 403) {
            handleAuthError('Session expired - please login again');
            return;
          }
          if (response.ok) {
            const result = await response.json();
            if (result.success) setOrgBusinessLineData(result.data);
          }
        } catch (error) {
          console.error('Error fetching org-business-lines details:', error);
        }
      };

      const fetchOrgPortfolios = async () => {
        try {
          const idToken = await getIdToken();
          const pid = localStorage.getItem('project_id') || selectedProject?.id || '101';
          const response = await fetchWithRetry(`https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/ricew/LOV/org-portfolios?project_id=${pid}`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (response.status === 401 || response.status === 403) {
            handleAuthError('Session expired - please login again');
            return;
          }
          if (response.ok) {
            const result = await response.json();
            if (result.success) setOrgPortfolioData(result.data);
          }
        } catch (error) {
          console.error('Error fetching org-portfolio details:', error);
        }
      };

      // Execute sequentially with delays to prevent throttling
      await fetchProcessStreams();
      await delay(300);
      await fetchOrgServiceDetails();
      await delay(300);
      await fetchOrgBusinessLines();
      await delay(300);
      await fetchOrgPortfolios();
    };

    const fetchExistingEmails = async () => {
      try {
        const token = await getIdToken();
        const projectId = localStorage.getItem('project_id') || selectedProject?.id;
        if (!projectId) return;

        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch emails from the single resource roster source
        const response = await fetch(`https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/request-form/get/resourceRosterFormICEmails?project_id=${projectId}`, { headers });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Session expired - please login again');
          return;
        }

        let allEmails = [];
        if (response.ok) {
          const result = await response.json();
          const emails = result.emails || result.data || [];
          if (Array.isArray(emails)) {
            allEmails = emails.filter(Boolean);
          }
        }

        // Deduplicate emails (case-insensitive)
        const uniqueEmailSet = new Set(allEmails.reduce((acc, e) => {
          let emailStr = '';
          if (typeof e === 'string') {
            emailStr = e;
          } else if (e && typeof e === 'object') {
            emailStr = e.IC_email || e.email || e.Email || Object.values(e)[0];
          }
          if (emailStr && typeof emailStr === 'string' && emailStr.trim() !== '') {
            acc.push(emailStr.trim().toLowerCase());
          }
          return acc;
        }, []));
        setExistingEmails([...uniqueEmailSet]);
      } catch (error) {
        console.error('Error fetching existing emails:', error);
      }
    };

    loadAllData();
    fetchExistingEmails();
  }, [selectedProject?.id]);

  // Function to load form data from API
  const loadFormData = async (id) => {
    setDataLoading(true);
    setError('');
    try {
      const url = `https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/get/rice-resource-roster-id?Resource_Roster_Form_id=${id}`;

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for load:', tokenError);
        // Continue without token - API might still work or will return 401
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      console.log('Loading form data from API...');

      const response = await fetchWithRetry(url, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Session expired - please login again');
        return;
      }

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data) {
          const mappedData = mapApiResponseToFormData(result.data);
          setFormData(mappedData);
          setOriginalEmail(mappedData.emailAddress || '');
          setCurrentRecordId(id); // Track the currently loaded record ID

          // Check if this record is a draft
          const isDraftRecord = result.data.save_Draft === 'true' || result.data.save_Draft === true;
          setIsDraft(isDraftRecord);

          // If user is in draft-from-API mode and switches to a different record,
          // mark that they've switched from the original draft
          if (isDraftFromAPI && !isDraftRecord) {
            setSwitchedFromDraft(true);
          }

          console.log('Loaded form data:', mappedData);
          console.log('Is draft record:', isDraftRecord);

          // Update URL if this is a different record than the original URL parameter
          if (formId && id !== formId) {
            navigate(`/dashboard/implementation-resource-form/edit/${id}`, { replace: true });
          }
        } else {
          throw new Error('Failed to load form data');
        }
      } else {
        throw new Error('Failed to fetch form data');
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      setError(`Failed to load form data: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  // Function to reload form data from API
  const reloadRecordData = async () => {
    if (!currentRecordId) return;

    try {
      setDataLoading(true);
      const url = `https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/get/rice-resource-roster-id?Resource_Roster_Form_id=${currentRecordId}`;

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for reload:', tokenError);
        // Continue without token - API might still work or will return 401
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetchWithRetry(url, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Session expired - please login again');
        return;
      }

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data) {
          const mappedData = mapApiResponseToFormData(result.data);
          setFormData(mappedData);
          setOriginalEmail(mappedData.emailAddress || '');

          // Check if this record is a draft
          const isDraftRecord = result.data.save_Draft === 'true' || result.data.save_Draft === true;
          setIsDraft(isDraftRecord);

          console.log('Reloaded form data:', mappedData);
        } else {
          console.error('Failed to fetch updated record data:', result);
        }
      } else {
        console.error('Failed to fetch updated record data from API');
      }
    } catch (error) {
      console.error('Error reloading record data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Load form data when formId is present (edit mode)
  useEffect(() => {
    if (formId) {
      loadFormData(formId);
    }
  }, [formId]);

  const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';

  // Fetch organization options using the LOV hook
  const { options: organizationOptions } = useLOV(`https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/si-organization-details?project_id=${projectId}`);

  // Fetch full name options using the LOV hook (only in edit mode)
  const { options: fullNameOptions } = useLOV(
    currentRecordId ? `https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/full-name-resource-roster-forms?project_id=${projectId}` : null,
    'Resource_Roster_Form_id',
    'IC_full_name'
  );

  // Fetch phone code options using the LOV hook
  const { options: phoneCodeOptions } = useLOV(`https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/countries?project_id=${projectId}`, 'PhoneCode', 'PhoneCode');

  // Fetch country options using the LOV hook for work location
  const { options: countryOptions } = useLOV(`https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/countries?project_id=${projectId}`, 'Country_Name', 'Country_Name');

  // Fetch work arrangement options using the LOV hook
  const { options: workArrangementOptions } = useLOV('https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/location-definitions', 'Location_Definition_id', 'location');

  // Fetch onboarding status options using the LOV hook
  const { options: onboardingStatusOptions } = useLOV('https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/onboarding-status-definitions', 'Onboarding_Status_Definition_id', 'onboarding_status');

  // Fetch billing status options using the LOV hook
  const { options: billingStatusOptions } = useLOV('https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/billing-status-definitions', 'Billing_Status_Definition_id', 'billing_status');

  // Auto-select Work Location, Nationality, and Phone Code if only one option is available
  useEffect(() => {
    if (!currentRecordId) {
      setFormData(prev => {
        let updated = false;
        const newData = { ...prev };

        if (!prev.workLocation && countryOptions && countryOptions.length === 1) {
          newData.workLocation = countryOptions[0].Country_Name;
          updated = true;
        }

        if (!prev.nationality && countryOptions && countryOptions.length === 1) {
          newData.nationality = countryOptions[0].Country_Name;
          updated = true;
        }

        if (!prev.code && phoneCodeOptions && phoneCodeOptions.length === 1) {
          newData.code = phoneCodeOptions[0].PhoneCode;
          updated = true;
        }

        if (!prev.organizationName && organizationOptions && organizationOptions.length === 1) {
          newData.organizationName = organizationOptions[0].value;
          updated = true;
        }

        return updated ? newData : prev;
      });
    }
  }, [countryOptions, phoneCodeOptions, organizationOptions, currentRecordId]);

  // Derive service line options based on selected organization
  const serviceLineOptions = React.useMemo(() => {
    if (!formData.organizationName || !orgServiceData.length) return [];
    const selectedOrg = orgServiceData.find(org => org.SI_organization_name === formData.organizationName);
    if (selectedOrg && selectedOrg.services) {
      // Find the portfolio display ID
      const selectedPortfolio = orgPortfolioData.find(org => org.SI_organization_name === formData.organizationName)
        ?.portfolios?.find(p => p.name === formData.portfolioName);
      const portfolioDisplayId = selectedPortfolio?.display_id;

      let filteredServices = selectedOrg.services;
      if (portfolioDisplayId) {
        filteredServices = filteredServices.filter(s => s.Portfolio_DisplayID === portfolioDisplayId);
      }

      return filteredServices.map(service => ({
        value: service.Service_Name,
        label: service.Service_Name
      }));
    }
    return [];
  }, [formData.organizationName, formData.portfolioName, orgServiceData, orgPortfolioData]);

  // Derive business line options based on selected organization
  const businessLineOptions = React.useMemo(() => {
    if (!formData.organizationName || !orgBusinessLineData.length) return [];
    const selectedOrg = orgBusinessLineData.find(org => org.SI_organization_name === formData.organizationName);
    if (selectedOrg && selectedOrg.business_lines) {
      return selectedOrg.business_lines.map(bl => ({
        value: bl.name,
        label: bl.name
      }));
    }
    return [];
  }, [formData.organizationName, orgBusinessLineData]);

  // Derive portfolio options based on selected organization
  const portfolioOptions = React.useMemo(() => {
    if (!formData.organizationName || !orgPortfolioData.length) return [];
    const selectedOrg = orgPortfolioData.find(org => org.SI_organization_name === formData.organizationName);
    if (selectedOrg && selectedOrg.portfolios) {
      // Find the business line display ID
      const selectedBL = orgBusinessLineData.find(org => org.SI_organization_name === formData.organizationName)
        ?.business_lines?.find(bl => bl.name === formData.businessLine);
      const blDisplayId = selectedBL?.display_id;

      let filteredPortfolios = selectedOrg.portfolios;
      if (blDisplayId) {
        filteredPortfolios = filteredPortfolios.filter(p => p.business_line_id === blDisplayId);
      }

      return filteredPortfolios.map(p => ({
        value: p.name,
        label: p.name
      }));
    }
    return [];
  }, [formData.organizationName, formData.businessLine, orgPortfolioData, orgBusinessLineData]);

  // Derive options for process streams and applications
  const baseProcessStreamOptions = processStreamsData.map(stream => ({
    value: stream.stream_name,
    label: stream.stream_name
  }));

  const processStreamOptions = [
    ...baseProcessStreamOptions,
    ...(formData.processStream && !baseProcessStreamOptions.some(opt => opt.value === formData.processStream) ? [{ value: formData.processStream, label: formData.processStream }] : [])
  ];

  const selectedStream = processStreamsData.find(stream => stream.stream_name === formData.processStream);
  const baseApplicationOptions = selectedStream ? selectedStream.applications.map(app => ({
    value: app.app_name,
    label: app.app_name
  })) : [];

  // Include the current application value even if it's not in the filtered list yet
  const applicationOptions = [
    ...baseApplicationOptions,
    ...(formData.application && !baseApplicationOptions.some(opt => opt.value === formData.application) ? [{ value: formData.application, label: formData.application }] : [])
  ];

  const selectedApplication = selectedStream?.applications.find(app => app.app_name === formData.application);

  // Track if process stream was just changed by user (not from initial load)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastProcessStream, setLastProcessStream] = useState(formData.processStream);
  const [lastApplication, setLastApplication] = useState(formData.application);

  // Reset application if user changes the process stream and the application doesn't belong to new stream
  useEffect(() => {
    if (isInitialLoad && formData.processStream && processStreamsData.length > 0) {
      // Initial load is complete, mark it
      setIsInitialLoad(false);
      setLastProcessStream(formData.processStream);
    } else if (!isInitialLoad && lastProcessStream !== formData.processStream && formData.processStream) {
      // Process stream was changed by user
      if (formData.application && !baseApplicationOptions.some(opt => opt.value === formData.application)) {
        // Clear Application using onChange handlers to trigger external change detection
        handleChange({ target: { name: 'application', value: '' } });
      }
      setLastProcessStream(formData.processStream);
    }
  }, [formData.processStream, baseApplicationOptions, lastProcessStream, isInitialLoad, processStreamsData.length]);


  const handleDateChange = (date, name) => {
    if (name) {
      // Clear field error when user clears or selects a date
      if (fieldErrors[name]) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }

      if (date) {
        // Handle both string (from CustomDatePicker) and Date object formats
        let apiDate = date;
        if (date instanceof Date) {
          // Convert Date object to YYYY-MM-DD format for API
          apiDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
        // If it's already a string, use it as is
        setFormData(prev => ({
          ...prev,
          [name]: apiDate
        }));

        // Real-time date validation
        setTimeout(() => {
          const updatedFormData = { ...formData, [name]: apiDate };
          validateDateRelationships(updatedFormData);

          // Clear the error if both validations pass
          setError('');
        }, 100);
      } else {
        // Handle empty/cleared date
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };
  // Auto-calculate Allocation % when Hours / Week changes
  useEffect(() => {
    if (formData.hoursPerWeek && !isNaN(formData.hoursPerWeek)) {
      const hours = parseFloat(formData.hoursPerWeek);
      const maxHours = 45;
      const calculatedAllocation = (hours / maxHours) * 100;
      // Truncate to 1 decimal place (not round) and ensure it's within valid range
      const truncatedAllocation = Math.min(Math.max(Math.floor(calculatedAllocation * 10) / 10, 0), 100);

      setFormData(prev => ({
        ...prev,
        allocationPercent: truncatedAllocation
      }));
    } else if (!formData.hoursPerWeek || formData.hoursPerWeek === '') {
      // Set Allocation % to 0 when Hours / Week is cleared
      setFormData(prev => ({
        ...prev,
        allocationPercent: 0
      }));
    }
  }, [formData.hoursPerWeek]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Hours per week validation removed as per request

    if (name === 'organizationName') {
      setFormData(prev => ({
        ...prev,
        organizationName: value,
        serviceLineName: '', // Reset service line when org changes
        businessLine: '', // Reset business line when org changes
        portfolioName: '' // Reset portfolio when org changes
      }));
    } else if (name === 'businessLine') {
      setFormData(prev => ({
        ...prev,
        businessLine: value,
        serviceLineName: '', // Reset service line when business line changes
        portfolioName: '' // Reset portfolio when business line changes
      }));
    } else if (name === 'portfolioName') {
      setFormData(prev => ({
        ...prev,
        portfolioName: value,
        serviceLineName: '' // Reset service line when portfolio changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateEmailField = (value) => {
    if (!value || value.trim() === '') {
      // Don't set error for empty field - let required validation handle it
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setFieldErrors(prev => ({
        ...prev,
        emailAddress: 'Please enter a valid email address'
      }));
    } else {
      /* const isDuplicate = existingEmails.some(email =>
        email.toLowerCase() === value.trim().toLowerCase()
      );
      const emailChanged = !currentRecordId || value.trim().toLowerCase() !== originalEmail.toLowerCase();

      if (emailChanged && isDuplicate) {
        setFieldErrors(prev => ({
          ...prev,
          emailAddress: 'This email address is already registered'
        }));
      } else { */
      // Clear email error if it's valid
      if (fieldErrors.emailAddress) {
        setFieldErrors(prev => ({
          ...prev,
          emailAddress: ''
        }));
      }
      /* } */
    }
  };

  const validatePhoneField = (value) => {
    if (!value || value.trim() === '') {
      // Don't set error for empty field - let required validation handle it
      return;
    }

    // Remove any non-digit characters for validation
    const digitsOnly = value.replace(/\D/g, '');

    if (digitsOnly.length !== 10) {
      setFieldErrors(prev => ({
        ...prev,
        phoneNumber: 'Phone number must be exactly 10 digits'
      }));
    } else {
      // Clear phone error if it's valid
      if (fieldErrors.phoneNumber) {
        setFieldErrors(prev => ({
          ...prev,
          phoneNumber: ''
        }));
      }
    }
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
    const executeGrantAccess = async () => {
      try {
        const idToken = await getIdToken();

        // 1. Assign User to Project API
        const assignRes = await fetch('https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/api/admin/assign-user-to-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            email: formData.emailAddress,
            name: formData.fullName,
            project_id: selectedProject?.id
          })
        });

        const assignResult = await assignRes.json();
        
        if (!assignResult.success) {
          setError(DOMPurify.sanitize('Failed to update project access in the backend. Database field update aborted.', { ALLOWED_TAGS: [] }));
          return;
        }

        // 2. Update Grant_Access flag in the resource roster table
        const response = await fetch(
          'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/update/rice-resource-roster/grant-access',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              resource_ids: [String(currentRecordId)],
              grant_access: true,
              updated_by: "1"
            })
          }
        );

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Session expired - please login again');
          return;
        }

        const result = await response.json();

        if (result.success) {
          setSuccessMessage('Access granted successfully');
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);
          // Reload record data to reflect changes
          reloadRecordData();
        } else {
          const sanitizedError = DOMPurify.sanitize(result.error || 'Failed to grant access', { ALLOWED_TAGS: [] });
          setError(sanitizedError);
        }
      } catch (error) {
        console.error('Error granting access:', error);
        const sanitizedError = DOMPurify.sanitize('Failed to grant access. Please try again.', { ALLOWED_TAGS: [] });
        setError(sanitizedError);
      }
    };

    setConfirmMessage('Are you sure you want to grant access to this record?');
    setConfirmAction(() => executeGrantAccess);
    setShowConfirmDialog(true);
  };

  const handleRevokeAccess = () => {
    const executeRevokeAccess = async () => {
      try {
        const idToken = await getIdToken();

        // 1. Remove User Access API
        const removeRes = await fetch('https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/api/admin/remove-user-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            email: formData.emailAddress,
            project_id: selectedProject?.id
          })
        });

        const removeResult = await removeRes.json();
        
        if (!removeResult.success) {
          setError(DOMPurify.sanitize('Failed to revoke project access in the backend. Database field update aborted.', { ALLOWED_TAGS: [] }));
          return;
        }

        // 2. Update Grant_Access flag in the resource roster table
        const response = await fetch(
          'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/update/rice-resource-roster/grant-access',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              resource_ids: [String(currentRecordId)],
              grant_access: false,
              updated_by: "1"
            })
          }
        );

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Session expired - please login again');
          return;
        }

        const result = await response.json();

        if (result.success) {
          setSuccessMessage('Access revoked successfully');
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);
          // Reload record data to reflect changes
          reloadRecordData();
        } else {
          const sanitizedError = DOMPurify.sanitize(result.error || 'Failed to revoke access', { ALLOWED_TAGS: [] });
          setError(sanitizedError);
        }
      } catch (error) {
        console.error('Error revoking access:', error);
        const sanitizedError = DOMPurify.sanitize('Failed to revoke access. Please try again.', { ALLOWED_TAGS: [] });
        setError(sanitizedError);
      }
    };

    setConfirmMessage('Are you sure you want to revoke access for this record?');
    setConfirmAction(() => executeRevokeAccess);
    setShowConfirmDialog(true);
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) {
      return;
    }

    // Clear previous messages
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate required fields
      const requiredFields = [
        { key: 'organizationName', label: 'Organization Name' },
        { key: 'fullName', label: 'Full Name' },
        { key: 'emailAddress', label: 'Email Address' },
        { key: 'primaryRole', label: 'Primary Role' },
        { key: 'resourceLevel', label: 'Resource Level' },
        { key: 'processStream', label: 'Process Stream' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' }
      ];

      // Initialize field errors
      const newFieldErrors = {};

      // Check each required field
      requiredFields.forEach(field => {
        // Skip validation if there's already an input error for this field
        if (inputErrors[field.key]) {
          return;
        }
        if (!formData[field.key] || formData[field.key].toString().trim() === '') {
          newFieldErrors[field.key] = `${field.label} is required`;
        }
      });

      // Additional email format and duplicate validation
      if (formData.emailAddress && formData.emailAddress.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.emailAddress)) {
          newFieldErrors.emailAddress = 'Please enter a valid email address';
        } else {
          /* const isDuplicate = existingEmails.some(email =>
            email.toLowerCase() === formData.emailAddress.trim().toLowerCase()
          );
          const emailChanged = !currentRecordId || formData.emailAddress.trim().toLowerCase() !== originalEmail.toLowerCase();

          if (emailChanged && isDuplicate) {
            newFieldErrors.emailAddress = 'This email address is already registered';
          } */
        }
      }

      // Additional phone number length validation
      if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
        const digitsOnly = formData.phoneNumber.replace(/\D/g, '');
        if (digitsOnly.length !== 10) {
          newFieldErrors.phoneNumber = 'Phone number must be exactly 10 digits';
        }
      }

      // Set field errors
      setFieldErrors(newFieldErrors);

      // Check if any fields have errors
      if (Object.keys(newFieldErrors).length > 0) {
        setLoading(false);
        return;
      }

      // Check for input errors (like invalid date formats)
      const activeInputErrors = Object.entries(inputErrors).filter(([_, error]) => error !== null);
      if (activeInputErrors.length > 0) {
        const firstError = activeInputErrors[0][1];
        const sanitizedError = DOMPurify.sanitize(`Please fix the following error: ${firstError}`, { ALLOWED_TAGS: [] });
        setErrorMessage(sanitizedError);
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        setLoading(false);
        return;
      }

      // Email validation - moved to field-level validation
      // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // if (!emailRegex.test(formData.emailAddress)) {
      //   setError('Please enter a valid email address');
      //   setLoading(false);
      //   return;
      // }

      // Allocation percentage validation - removed since it's auto-calculated
      // const allocationPercentage = parseFloat(formData.allocationPercent);
      // if (isNaN(allocationPercentage) || allocationPercentage < 0 || allocationPercentage > 100) {
      //   setError('Allocation percentage must be between 0 and 100');
      //   setLoading(false);
      //   return;
      // }

      // Hours per week validation - removed as per request

      // Date validations
      if (Object.keys(dateValidationErrors).length > 0) {
        const firstError = Object.values(dateValidationErrors)[0];
        const sanitizedError = DOMPurify.sanitize(firstError, { ALLOWED_TAGS: [] });
        setValidationErrorMessage(sanitizedError);
        setShowValidationError(true);
        setTimeout(() => {
          setShowValidationError(false);
          setValidationErrorMessage('');
        }, 5000);
        setLoading(false);
        return;
      }

      // Check if there's already a validation error (like date validation)
      if (error) {
        setLoading(false);
        return;
      }

      // Prepare payload for API
      const payload = {
        // Identification & Contact
        IC_organization_name: formData.organizationName,
        IC_business_line_name: formData.businessLine,
        IC_portfolio_name: formData.portfolioName,
        IC_service_line_name: formData.serviceLineName,
        IC_full_name: formData.fullName,
        IC_email: formData.emailAddress,
        IC_phone: formData.phoneNumber,
        IC_primary_phone_no_code: formData.code,
        IC_employment_type: formData.employmentType,
        IC_work_location: formData.workLocation,
        IC_nationality: formData.nationality,

        // Engagement & Role
        ER_process_stream: formData.processStream,
        ER_application: formData.application,
        ER_primary_role: formData.primaryRole,
        ER_resource_level: formData.resourceLevel,
        ER_start_date: formData.startDate,
        ER_end_date: formData.endDate,
        ER_onboarding_status: onboardingStatusOptions.find(opt => opt.value === formData.onboardingStatus)?.label || formData.onboardingStatus,

        // Staffing & Allocation
        SA_allocation_percentage: formData.allocationPercent?.toString() || '0',
        SA_hours_per_week: formData.hoursPerWeek?.toString() || '0',
        SA_remote_onsite_hybrid: workArrangementOptions.find(opt => opt.value === formData.workArrangement)?.label || formData.workArrangement,

        // Billing & Commercials
        BC_billability_status: billingStatusOptions.find(opt => opt.value === formData.billingStatus)?.label || formData.billingStatus,
        BC_billing_start_date: formData.billingStartDate,
        BC_rate_card: '',
        rate_Amount: '',

        // User and Project IDs
        user_id: localStorage.getItem('user_id') || '1',
        project_id: localStorage.getItem('project_id') || selectedProject?.id || '101',
        updated_by: localStorage.getItem('user_id') || '1',

        // Resource Comment
        resource_comment: formData.resourceComment || '',

        // Save Draft flag - set to false for regular submit
        save_Draft: 'false'
      };

      console.log('Submitting payload:', payload);

      const updatedBy = localStorage.getItem('user_id') || '1';
      const url = currentRecordId
        ? `https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/update/rice-resource-roster?Resource_Roster_Form_id=${currentRecordId}&updated_by=${updatedBy}`
        : `https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/post/rice-resource-roster`;

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for submit:', tokenError);
        const sanitizedError = DOMPurify.sanitize('Authentication error. Please login again.', { ALLOWED_TAGS: [] });
        setErrorMessage(sanitizedError);
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

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Session expired - please login again');
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        const successMessage = currentRecordId
          ? 'Resource Form updated successfully!'
          : 'Resource Form created successfully!';
        const sanitizedMessage = DOMPurify.sanitize(successMessage, { ALLOWED_TAGS: [] });
        setSuccessMessage(sanitizedMessage);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        // Reset form after successful submission (only for create, not update)
        if (!currentRecordId) {
          handleReset();
        }

        // Auto-close after 2 seconds only for new records, reload data for existing records
        setTimeout(async () => {
          if (!currentRecordId) {
            onClose();
          } else {
            // For existing records, reload the data from API to get the latest changes
            await reloadRecordData();
          }
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to save resource roster');
      }

    } catch (error) {
      console.error('Error submitting form:', error);
      const sanitizedError = DOMPurify.sanitize(`Failed to submit form: ${error.message}`, { ALLOWED_TAGS: [] });
      setErrorMessage(sanitizedError);
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) {
      return;
    }

    // Clear previous messages
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Minimal validation for draft save - only essential fields required
      const draftRequiredFields = [
        { key: 'fullName', label: 'Full Name' },
        { key: 'emailAddress', label: 'Email Address' }
      ];

      // Initialize field errors for draft
      const draftFieldErrors = {};

      // Check only draft-required fields
      draftRequiredFields.forEach(field => {
        // Skip validation if there's already an input error for this field
        if (inputErrors[field.key]) {
          return;
        }
        if (!formData[field.key] || formData[field.key].toString().trim() === '') {
          draftFieldErrors[field.key] = `${field.label} is required`;
        }
      });

      // Additional email format and duplicate validation for draft
      if (formData.emailAddress && formData.emailAddress.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.emailAddress)) {
          draftFieldErrors.emailAddress = 'Please enter a valid email address';
        } else {
          /* const isDuplicate = existingEmails.some(email =>
            email.toLowerCase() === formData.emailAddress.trim().toLowerCase()
          );
          const emailChanged = !currentRecordId || formData.emailAddress.trim().toLowerCase() !== originalEmail.toLowerCase();

          if (emailChanged && isDuplicate) {
            draftFieldErrors.emailAddress = 'This email address is already registered';
          } */
        }
      }

      // Set field errors if any
      setFieldErrors(draftFieldErrors);

      // Check if any draft fields have errors
      if (Object.keys(draftFieldErrors).length > 0) {
        setLoading(false);
        return;
      }

      // Check for input errors (like invalid date formats)
      const activeInputErrors = Object.entries(inputErrors).filter(([_, error]) => error !== null);
      if (activeInputErrors.length > 0) {
        const firstError = activeInputErrors[0][1];
        const sanitizedError = DOMPurify.sanitize(`Please fix the following error: ${firstError}`, { ALLOWED_TAGS: [] });
        setErrorMessage(sanitizedError);
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        setLoading(false);
        return;
      }

      // Prepare payload for API with save_Draft flag
      const payload = {
        // Identification & Contact
        IC_organization_name: formData.organizationName,
        IC_business_line_name: formData.businessLine,
        IC_portfolio_name: formData.portfolioName,
        IC_service_line_name: formData.serviceLineName,
        IC_full_name: formData.fullName,
        IC_email: formData.emailAddress,
        IC_phone: formData.phoneNumber,
        IC_primary_phone_no_code: formData.code,
        IC_employment_type: formData.employmentType,
        IC_work_location: formData.workLocation,
        IC_nationality: formData.nationality,

        // Engagement & Role
        ER_process_stream: formData.processStream,
        ER_application: formData.application,
        ER_primary_role: formData.primaryRole,
        ER_resource_level: formData.resourceLevel,
        ER_start_date: formData.startDate,
        ER_end_date: formData.endDate,
        ER_onboarding_status: onboardingStatusOptions.find(opt => opt.value === formData.onboardingStatus)?.label || formData.onboardingStatus,

        // Staffing & Allocation
        SA_allocation_percentage: formData.allocationPercent?.toString() || '0',
        SA_hours_per_week: formData.hoursPerWeek?.toString() || '0',
        SA_remote_onsite_hybrid: workArrangementOptions.find(opt => opt.value === formData.workArrangement)?.label || formData.workArrangement,

        // Billing & Commercials
        BC_billability_status: billingStatusOptions.find(opt => opt.value === formData.billingStatus)?.label || formData.billingStatus,
        BC_billing_start_date: formData.billingStartDate,
        BC_rate_card: '',
        rate_Amount: '',

        // User and Project IDs
        user_id: localStorage.getItem('user_id') || '1',
        project_id: localStorage.getItem('project_id') || selectedProject?.id || '101',
        updated_by: localStorage.getItem('user_id') || '1',

        // Resource Comment
        resource_comment: formData.resourceComment || '',

        // Save Draft flag
        save_Draft: 'true'
      };

      console.log('Submitting draft payload:', payload);

      // Determine which API endpoint to use based on whether we're editing or creating
      const updatedBy = localStorage.getItem('user_id') || '1';
      let url;
      if (currentRecordId) {
        // Update existing record
        url = `https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/update/rice-resource-roster?Resource_Roster_Form_id=${currentRecordId}&updated_by=${updatedBy}`;
      } else {
        // Create new record
        url = `https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/post/rice-resource-roster`;
      }

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for draft save:', tokenError);
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

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Session expired - please login again');
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        const sanitizedMessage = DOMPurify.sanitize('Resource Form saved as draft successfully!', { ALLOWED_TAGS: [] });
        setSuccessMessage(sanitizedMessage);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        // Auto-close after 2 seconds only for new records, reload data for existing records
        setTimeout(async () => {
          if (!currentRecordId) {
            onClose();
          } else {
            // For existing records, reload the data from API to get the latest changes
            await reloadRecordData();
          }
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to save resource roster as draft');
      }

    } catch (error) {
      console.error('Error saving draft:', error);
      const sanitizedError = DOMPurify.sanitize(`Failed to save draft: ${error.message}`, { ALLOWED_TAGS: [] });
      setErrorMessage(sanitizedError);
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(defaultFormData);
  };

  return (
    <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
      {/* Project Info */}
      {selectedProject && (
        <div style={{ padding: '1.5rem 2rem 0.5rem 2rem' }}>
          <h3 style={{ margin: '0', color: '#333', fontSize: '16px' }}>
            Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span>
          </h3>
        </div>
      )}

      {/* Main Form Container */}
      <div style={{ padding: '1rem 1rem 2rem 1rem', maxWidth: '100%', margin: '0' }}>
        {/* Draft Status Banner */}
        {(isDraftFromAPI || isDraft) && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#f59e0b',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
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
              {isDraftFromAPI
                ? (switchedFromDraft
                  ? 'Click "Save Record" to finalize it.'
                  : 'This is a saved draft record. Complete the form and click "Save Record" to finalize it.')
                : 'This is a saved draft record. Complete the form and click "Update" to finalize it.'}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Data Loading Indicator */}
          {dataLoading && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              backgroundColor: 'white',
              border: '1px solid #9ca3af',
              marginBottom: '1rem'
            }}>
              <div style={{ color: '#666', fontSize: '16px' }}>Loading form data...</div>
            </div>
          )}

          {/* Form Title */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            marginBottom: '1rem',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '10px 16px',
              color: '#333',
              fontSize: '16px',
              fontWeight: '600',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{isDraftFromAPI ? 'Save Draft Resource Form' : (currentRecordId ? 'Resource Form' : 'Resource Form')}</span>
              <button
                type="button"
                onClick={() => setShowHelpPopup(true)}
                style={{
                  backgroundColor: '#4D5C74',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3b4b5e'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}
              >
                <HelpCircle size={15} />
                Help
              </button>
            </div>
          </div>

          {/* Identification and Contact Information */}
          <IdentificationContactSection
            formData={formData}
            handleChange={handleChange}
            validateEmailField={validateEmailField}
            validatePhoneField={validatePhoneField}
            organizationOptions={organizationOptions}
            fullNameOptions={fullNameOptions}
            phoneCodeOptions={phoneCodeOptions}
            countryOptions={countryOptions}
            serviceLineOptions={serviceLineOptions}
            businessLineOptions={businessLineOptions}
            portfolioOptions={portfolioOptions}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            isEditMode={!!currentRecordId}
            onResourceChange={loadFormData}
          />

          {/* Engagement & Role */}
          <EngagementRoleSection
            formData={formData}
            handleChange={handleChange}
            processStreamOptions={processStreamOptions}
            applicationOptions={applicationOptions}
            onboardingStatusOptions={onboardingStatusOptions}
            handleDateChange={handleDateChange}
            handleInputError={handleInputError}
            clearFieldError={clearFieldError}
            clearDateValidationError={clearDateValidationError}
            fieldErrors={fieldErrors}
            dateValidationErrors={dateValidationErrors}
            projectId={selectedProject?.id || '1'}
          />

          {/* Staffing and Allocation & Billing & Commercials (Side by Side) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 1fr',
            gap: '1rem'
          }}>
            {/* Staffing and Allocation */}
            <StaffingAllocationSection
              formData={formData}
              handleChange={handleChange}
              workArrangementOptions={workArrangementOptions}
              fieldErrors={fieldErrors}
            />

            {/* Billing & Commercials */}
            <BillingCommercialsSection
              formData={formData}
              handleChange={handleChange}
              handleDateChange={handleDateChange}
              handleInputError={handleInputError}
              clearFieldError={clearFieldError}
              clearDateValidationError={clearDateValidationError}
              fieldErrors={fieldErrors}
              dateValidationErrors={dateValidationErrors}
              billingStatusOptions={billingStatusOptions}
              setFieldErrors={setFieldErrors}
            />
          </div>

          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(error, { ALLOWED_TAGS: [] })}
            </div>
          )}

          {success && (
            <div style={{
              marginTop: '1rem',
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              color: '#166534',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(success, { ALLOWED_TAGS: [] })}
            </div>
          )}

          {/* Form Actions */}
          <div style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              style={{
                padding: '10px 24px',
                backgroundColor: loading ? '#93c5fd' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3b82f6')}
            >
              {loading ? 'Saving Draft...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              style={{
                padding: '10px 24px',
                backgroundColor: loading ? '#fca5a5' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#c82333')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#dc3545')}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                backgroundColor: loading ? '#28a745' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#218838')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#28a745')}
            >
              {loading ? (
                isDraftFromAPI ? 'Saving Record...' :
                  currentRecordId ? 'Updating...' : 'Submitting...'
              ) : (
                isDraftFromAPI ? 'Save Record' :
                  currentRecordId ? 'Update' : 'Submit'
              )}
            </button>
          </div>

          {/* Grant & Revoke Access Buttons - Only for existing records */}
          {currentRecordId && (
            <div style={{
              marginTop: '10px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={handleRevokeAccess}
                disabled={String(formData.grantAccess) !== "true" || isDraft}
                style={{
                  padding: '10px 12px',
                  backgroundColor: (String(formData.grantAccess) !== "true" || isDraft) ? '#f8f8f8' : '#ef4444',
                  color: (String(formData.grantAccess) !== "true" || isDraft) ? '#999' : 'white',
                  border: (String(formData.grantAccess) !== "true" || isDraft) ? '1px solid #ddd' : 'none',
                  borderRadius: '6px',
                  cursor: (String(formData.grantAccess) !== "true" || isDraft) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (String(formData.grantAccess) === "true" && !isDraft) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (String(formData.grantAccess) === "true" && !isDraft) {
                    e.target.style.backgroundColor = '#ef4444';
                  }
                }}
                title={isDraft ? "Cannot revoke access for draft records" : ""}
              >
                Revoke Access
              </button>
              <button
                type="button"
                onClick={handleGrantAccess}
                disabled={String(formData.grantAccess) === "true" || isDraft}
                style={{
                  padding: '10px 12px',
                  backgroundColor: (String(formData.grantAccess) === "true" || isDraft) ? '#f8f8f8' : '#28a745',
                  color: (String(formData.grantAccess) === "true" || isDraft) ? '#999' : 'white',
                  border: (String(formData.grantAccess) === "true" || isDraft) ? '1px solid #ddd' : 'none',
                  borderRadius: '6px',
                  cursor: (String(formData.grantAccess) === "true" || isDraft) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (String(formData.grantAccess) !== "true" && !isDraft) {
                    e.target.style.backgroundColor = '#218838';
                  }
                }}
                onMouseLeave={(e) => {
                  if (String(formData.grantAccess) !== "true" && !isDraft) {
                    e.target.style.backgroundColor = '#28a745';
                  }
                }}
                title={isDraft ? "Cannot grant access to draft records" : ""}
              >
                Grant Access
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Standardized Loading Overlay */}
      {(loading || dataLoading) && (
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

      {/* Validation Error Message Popup */}
      {showValidationError && (
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
          <span style={{ fontWeight: '500' }}>{validationErrorMessage}</span>
          <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowValidationError(false)} />
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
                    The <strong>Resource Roster Form</strong> captures all details about an individual resource assigned to the ERP implementation project. It is the single source of truth for a resource&#39;s identity, role, engagement dates, staffing allocation, and billing information.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    ERP projects involve large, cross-functional teams. The Resource Roster tracks who is working on the project, in what capacity, and on which workstream — enabling project managers to monitor resourcing, onboarding status, billing, and system access from a single form.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Form sections</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Identification &amp; Contact</strong> — Core identity fields: Organization, Business Line, Portfolio, Service Line, Full Name, Email, Phone, Employment Type, Work Location, and Nationality.</li>
                    <li><strong>Engagement &amp; Role</strong> — Project assignment details: Process Stream, Application, Primary Role, Resource Level, Start/End Dates, and Onboarding Status.</li>
                    <li><strong>Staffing &amp; Allocation</strong> — Capacity information: Hours per Week (auto-calculates Allocation %), and Work Arrangement (Remote / Onsite / Hybrid).</li>
                    <li><strong>Billing &amp; Commercials</strong> — Financial details: Billability Status and Billing Start Date.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Required fields</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    The following fields are required to submit the form: <strong>Organization Name</strong>, <strong>Full Name</strong>, <strong>Email Address</strong>, <strong>Primary Role</strong>, <strong>Resource Level</strong>, and <strong>Process Stream</strong>. All other fields are optional.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Save Draft vs Submit</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Save Draft</strong> — Saves the form with only Full Name and Email required. Use this to record a resource before all details are available. Draft records are highlighted with a yellow banner and cannot have project access granted until they are fully submitted.</li>
                    <li><strong>Submit / Update</strong> — Saves the complete record with full validation. All required fields must be filled.</li>
                    <li><strong>Clear</strong> — Resets all form fields to their default empty state.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Grant &amp; Revoke Access</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>These buttons appear only when editing an existing record (not when creating a new one).</li>
                    <li><strong>Grant Access</strong> — Activates the resource&#39;s project login using their registered email. Disabled if access is already granted or if the record is a draft.</li>
                    <li><strong>Revoke Access</strong> — Removes the resource&#39;s project login. Disabled if access has not been granted or if the record is a draft.</li>
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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ResourceRosterFormDetails;