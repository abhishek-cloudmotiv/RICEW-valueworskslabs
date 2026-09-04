import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import useLOV from '../../hooks/useLOV';
import { GeneralInformationSection, ProcessStreamInformationSection, StatusEffortInformationSection, ImplementationPhaseSection, OwnershipSection, NoteSection, RicewResourceResponsibilitySection, SuccessMessage, ErrorMessage } from './RicewFormSections';
import { CostOrganizationAutocomplete } from './RicewAutocompleteComponents';
import * as XLSX from 'xlsx';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';
import { HelpCircle, X } from 'lucide-react';

// RICEW Type Mapping for display and API consistency
const ricewTypeMapping = {
  'Integration': 'Integrations',
  'Conversion': 'Conversions',
  'Report': 'Reports',
  'Analytics Report': 'Analytics Reports',
  'Alert': 'Alert',
  'Workflow': 'Workflow',
  'Personalization': 'Personalization',
  'Extension': 'Extensions'
};

const reverseRicewTypeMapping = {
  'Integrations': 'Integration',
  'Conversions': 'Conversion',
  'Reports': 'Report',
  'Analytics Reports': 'Analytics Report',
  'Alert': 'Alert',
  'Workflow': 'Workflow',
  'Personalization': 'Personalization',
  'Extensions': 'Extension'
};

// Robust mapper to ensure we always send exactly what the backend expects
const getBackendRicewType = (frontendType) => {
  if (!frontendType) return '';
  const type = String(frontendType).trim();

  // 1. Direct reverse mapping match
  if (reverseRicewTypeMapping[type]) {
    return reverseRicewTypeMapping[type];
  }

  // 2. Fuzzy match against backend keys
  const expectedBackendKeys = [
    'Report', 'Integration', 'Extension', 'Workflow',
    'Alert', 'Analytics Report', 'Personalization', 'Conversion'
  ];

  const lowerType = type.toLowerCase();
  for (const expected of expectedBackendKeys) {
    // e.g. "analytics" in "analytics report" or vice versa
    if (lowerType.includes(expected.toLowerCase()) || expected.toLowerCase().includes(lowerType)) {
      return expected;
    }
  }

  return type; // fallback
};

// Helper function to parse RICEW Cost strings like "(INR) (946.78)" into amount and currency
const parseRicewCost = (costStr) => {
  if (!costStr) return { amount: '', currency: '' };

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

  return { amount, currency };
};

// Custom hook for Resource Roster LOV (for Functional/Technical Owners)
const useResourceRosterLOV = (projectId) => {
  const [resourceRosterData, setResourceRosterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResourceRosterData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          setError(tokenError.message);
          setLoading(false);
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });
        const response = await fetch(`https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/full-name-resource-roster-forms?project_id=${sanitizedProjectId}`, {
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          setError('Unauthorized - session expired');
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch resource roster data');
        const result = await response.json();
        if (result.success && result.data) {
          // Sort data by Resource_Roster_Form_id in ascending order (smallest first, largest last)
          const sanitizedData = result.data.map(item => ({
            Resource_Roster_Form_id: DOMPurify.sanitize(String(item.Resource_Roster_Form_id || '').trim(), { ALLOWED_TAGS: [] }),
            IC_full_name: DOMPurify.sanitize(String(item.IC_full_name || '').trim(), { ALLOWED_TAGS: [] }),
            IC_email: DOMPurify.sanitize(String(item.IC_email || '').trim(), { ALLOWED_TAGS: [] })
          }));
          const sortedData = sanitizedData.sort((a, b) => parseInt(a.Resource_Roster_Form_id) - parseInt(b.Resource_Roster_Form_id));
          setResourceRosterData(sortedData);
        }
      } catch (err) {
        console.error('Error fetching resource roster data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResourceRosterData();
  }, [projectId]);

  // Transform to options format with Resource_Roster_Form_id as unique value
  const resourceRosterOptions = React.useMemo(() => {
    return resourceRosterData.map(item => ({
      value: item.Resource_Roster_Form_id,
      label: item.IC_full_name,
      email: item.IC_email,
      id: item.Resource_Roster_Form_id
    }));
  }, [resourceRosterData]);

  return {
    loading,
    error,
    resourceRosterOptions
  };
};

/*
// Custom hook for Legal Entity LOV
const useLegalEntityLOV = (projectId) => {
  const [legalEntityData, setLegalEntityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLegalEntityData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Get ID token for authorization
        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for legal entity:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch(`https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/legal-entity-master?project_id=${projectId}`, {
          headers: headers
        });
        if (!response.ok) throw new Error('Failed to fetch legal entity data');
        const result = await response.json();
        if (result.success && result.data) {
          // Sort data by legal_Entity_Master_id in ascending order (smallest first, largest last)
          const sortedData = result.data.sort((a, b) => parseInt(a.legal_Entity_Master_id) - parseInt(b.legal_Entity_Master_id));
          setLegalEntityData(sortedData);
        }
      } catch (err) {
        console.error('Error fetching legal entity data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLegalEntityData();
  }, [projectId]);

  // Transform to options format with name included
  const legalEntityOptions = React.useMemo(() => {
    return legalEntityData.map(item => ({
      value: item.legalEntityCode,
      label: item.legalEntityCode,
      name: item.legalEntityName
    }));
  }, [legalEntityData]);

  return {
    loading,
    error,
    legalEntityOptions
  };
};
*/

// Custom hook for RICEW Status LOV
const useRicewStatusLOV = () => {
  const [ricewStatusData, setRicewStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRicewStatusData = async () => {
      try {
        setLoading(true);
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          setError(tokenError.message);
          setLoading(false);
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const response = await fetch('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/ricew-status', {
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          setError('Unauthorized - session expired');
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch RICEW status data');
        const result = await response.json();
        if (result.success && result.data) {
          // Sanitize and sort data by RICEW_Status_Id ascending
          const sanitizedData = result.data.map(item => ({
            RICEW_Status_Id: item.RICEW_Status_Id,
            Status_Name: DOMPurify.sanitize(String(item.Status_Name || '').trim(), { ALLOWED_TAGS: [] })
          }));
          const sortedData = sanitizedData.sort((a, b) =>
            a.RICEW_Status_Id - b.RICEW_Status_Id
          );
          setRicewStatusData(sortedData);
        }
      } catch (err) {
        console.error('Error fetching RICEW status data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRicewStatusData();
  }, []);

  // Transform to options format using Status_Name for both value and label
  const ricewStatusOptions = React.useMemo(() => {
    return ricewStatusData.map(item => ({
      value: item.Status_Name,
      label: item.Status_Name
    }));
  }, [ricewStatusData]);

  return {
    loading,
    error,
    ricewStatusOptions
  };
};

// Custom hook for Cost Estimates Organizations LOV
const useCostEstimatesOrganizationsLOV = () => {
  const [organizationsData, setOrganizationsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizationsData = async () => {
      try {
        setLoading(true);
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          setError(tokenError.message);
          setLoading(false);
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const response = await fetch('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/cost-estimates-organizations', {
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          setError('Unauthorized - session expired');
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch cost estimates organizations data');
        const result = await response.json();
        if (result.success && result.data) {
          const sanitizedData = result.data.map(item => ({
            organization_id: DOMPurify.sanitize(String(item.organization_id || '').trim(), { ALLOWED_TAGS: [] }),
            organization_name: DOMPurify.sanitize(String(item.organization_name || '').trim(), { ALLOWED_TAGS: [] })
          }));
          setOrganizationsData(sanitizedData);
        }
      } catch (err) {
        console.error('Error fetching cost estimates organizations data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationsData();
  }, []);

  // Transform to options format using organization_id for display
  const costEstimatesOrganizationsOptions = React.useMemo(() => {
    return organizationsData.map(item => ({
      value: item.organization_id,
      label: item.organization_id,
      organizationName: item.organization_name
    }));
  }, [organizationsData]);

  return {
    loading,
    error,
    costEstimatesOrganizationsOptions
  };
};

// Custom hook for Wave-Rollout cascading LOV
const useWaveRolloutLOV = (projectId) => {
  const [waveRolloutData, setWaveRolloutData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWaveRolloutData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          setError(tokenError.message);
          setLoading(false);
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });
        const response = await fetch(`https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/wave-rollout-definitions?project_id=${sanitizedProjectId}`, {
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          setError('Unauthorized - session expired');
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch wave-rollout data');
        const result = await response.json();
        if (result.success && result.data) {
          // Sanitize wave and rollout data
          const sanitizedData = result.data.map(item => ({
            waveRolloutId: item.waveRolloutId,
            Wave_Code: DOMPurify.sanitize(String(item.Wave_Code || '').trim(), { ALLOWED_TAGS: [] }),
            Wave_Description: DOMPurify.sanitize(String(item.Wave_Description || '').trim(), { ALLOWED_TAGS: [] }),
            Rollouts: item.Rollouts ? item.Rollouts.map(r => ({
              Rollout_Code: DOMPurify.sanitize(String(r.Rollout_Code || '').trim(), { ALLOWED_TAGS: [] }),
              Rollout_Description: DOMPurify.sanitize(String(r.Rollout_Description || '').trim(), { ALLOWED_TAGS: [] }),
              rice_Rollout_Definition_id: r.rice_Rollout_Definition_id
            })).sort((a, b) => parseInt(a.rice_Rollout_Definition_id) - parseInt(b.rice_Rollout_Definition_id)) : []
          }));
          // Sort data by waveRolloutId in ascending order (smallest first, largest last)
          const sortedData = sanitizedData.sort((a, b) => parseInt(a.waveRolloutId) - parseInt(b.waveRolloutId));
          setWaveRolloutData(sortedData);
        }
      } catch (err) {
        console.error('Error fetching wave-rollout data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWaveRolloutData();
  }, [projectId]);

  // Get unique wave options — each item in waveRolloutData is a wave with nested Rollouts[]
  const waveOptions = React.useMemo(() => {
    return waveRolloutData.map(item => ({
      value: item.Wave_Code,
      label: item.Wave_Description,
      code: item.Wave_Code
    }));
  }, [waveRolloutData]);

  // Get rollout options based on selected wave
  const getRolloutOptions = (selectedWaveCode) => {
    if (!selectedWaveCode) return [];
    const wave = waveRolloutData.find(item => item.Wave_Code === selectedWaveCode);
    if (!wave || !wave.Rollouts) return [];
    return wave.Rollouts.map(r => ({
      value: r.Rollout_Code,
      label: r.Rollout_Description,
      code: r.Rollout_Code
    }));
  };

  return {
    loading,
    error,
    waveOptions,
    getRolloutOptions
  };
};

// Custom hook for Rate Card Names LOV
const useRateCardNamesLOV = (projectId) => {
  const [rateCardNamesData, setRateCardNamesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRateCardNames = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          setError(tokenError.message);
          setLoading(false);
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });
        const response = await fetch(`https://6ooh8kh7i4.execute-api.ap-south-1.amazonaws.com/New/ricew/effortCostRateCard/getUniqueNames?project_id=${sanitizedProjectId}`, {
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          setError('Unauthorized - session expired');
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch rate card names');
        const result = await response.json();
        if (result.success && result.data) {
          const sanitizedData = result.data.map(item => ({
            Effort_Rate_Card_Name_index: item.Effort_Rate_Card_Name_index,
            Effort_Rate_Card_Name: DOMPurify.sanitize(String(item.Effort_Rate_Card_Name || '').trim(), { ALLOWED_TAGS: [] })
          }));
          setRateCardNamesData(sanitizedData);
        }
      } catch (err) {
        console.error('Error fetching rate card names:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRateCardNames();
  }, [projectId]);

  // Transform to options format - use index as unique value
  const rateCardNameOptions = React.useMemo(() => {
    return rateCardNamesData.map(item => ({
      value: item.Effort_Rate_Card_Name_index, // Use index as unique identifier
      label: item.Effort_Rate_Card_Name,
      name: item.Effort_Rate_Card_Name,
      index: item.Effort_Rate_Card_Name_index
    }));
  }, [rateCardNamesData]);

  return {
    loading,
    error,
    rateCardNameOptions
  };
};

// Custom hook for cascading LOV options
const useCascadingLOV = () => {
  const [masterData, setMasterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoading(true);
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          setError(tokenError.message);
          setLoading(false);
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const response = await fetch('https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/allMasterProcessStreams', {
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          setError('Unauthorized - session expired');
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch master data');
        const data = await response.json();

        // Sanitize master data recursively
        const sanitizedData = data.map(stream => ({
          stream_name: DOMPurify.sanitize(String(stream.stream_name || '').trim(), { ALLOWED_TAGS: [] }),
          applications: stream.applications ? stream.applications.map(app => ({
            app_name: DOMPurify.sanitize(String(app.app_name || '').trim(), { ALLOWED_TAGS: [] }),
            l0_processes: app.l0_processes ? app.l0_processes.map(l0 => ({
              l0_name: DOMPurify.sanitize(String(l0.l0_name || '').trim(), { ALLOWED_TAGS: [] })
            })) : [],
            modules: app.modules ? app.modules.map(module => ({
              module_name: DOMPurify.sanitize(String(module.module_name || '').trim(), { ALLOWED_TAGS: [] })
            })) : []
          })) : []
        }));

        setMasterData(sanitizedData);
      } catch (err) {
        console.error('Error fetching master data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  // Transform data for different levels
  const processStreamOptions = masterData.map(stream => ({
    value: stream.stream_name, // Use display name as value
    label: stream.stream_name
  }));

  const getApplicationOptions = (selectedProcessStream) => {
    if (!selectedProcessStream) return [];
    const stream = masterData.find(s => s.stream_name === selectedProcessStream); // Find by display name
    return stream ? stream.applications.map(app => ({
      value: app.app_name, // Use display name as value
      label: app.app_name
    })) : [];
  };

  const getL0ProcessOptions = (selectedProcessStream, selectedApplication) => {
    if (!selectedProcessStream || !selectedApplication) return [];
    const stream = masterData.find(s => s.stream_name === selectedProcessStream); // Find by display name
    if (!stream) return [];
    const application = stream.applications.find(app => app.app_name === selectedApplication); // Find by display name
    return application ? application.l0_processes.map(l0 => ({
      value: l0.l0_name, // Use display name as value
      label: l0.l0_name
    })) : [];
  };

  const getModuleOptions = (selectedProcessStream, selectedApplication) => {
    if (!selectedProcessStream || !selectedApplication) return [];
    const stream = masterData.find(s => s.stream_name === selectedProcessStream); // Find by display name
    if (!stream) return [];
    const application = stream.applications.find(app => app.app_name === selectedApplication); // Find by display name
    return application ? application.modules.map(module => ({
      value: module.module_name, // Use display name as value
      label: module.module_name
    })) : [];
  };

  return {
    loading,
    error,
    processStreamOptions,
    getApplicationOptions,
    getL0ProcessOptions,
    getModuleOptions
  };
};

// Custom hook for Organization and Service Line LOV
const useOrgServiceLineLOV = (projectId) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          setError(tokenError.message);
          setLoading(false);
          return;
        }

        const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });
        const response = await fetch(`https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/rateCard/uniqueOrgBusinessLine?project_id=${sanitizedProjectId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401 || response.status === 403) {
          setError('Unauthorized - session expired');
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch org service line data');
        const result = await response.json();
        if (result.success && result.data) {
          const sanitizedData = result.data.map(item => ({
            SI_Organization_Details_id: item.SI_Organization_Details_id,
            SI_organization_name: DOMPurify.sanitize(String(item.SI_organization_name || '').trim(), { ALLOWED_TAGS: [] }),
            ServiceLines: item.ServiceLines ? item.ServiceLines.map(sl => ({
              Business_Line_Name: DOMPurify.sanitize(String(sl.Business_Line_Name || '').trim(), { ALLOWED_TAGS: [] }),
              Portfolio_Name: DOMPurify.sanitize(String(sl.Portfolio_Name || '').trim(), { ALLOWED_TAGS: [] }),
              Service_Name: DOMPurify.sanitize(String(sl.Service_Name || '').trim(), { ALLOWED_TAGS: [] })
            })) : []
          }));
          setData(sanitizedData);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const organizationOptions = React.useMemo(() => {
    const uniqueOrgs = new Map();
    data.forEach(item => {
      const orgId = item.SI_Organization_Details_id ? String(item.SI_Organization_Details_id) : '';
      if (orgId && !uniqueOrgs.has(orgId)) {
        uniqueOrgs.set(orgId, {
          value: orgId,
          label: item.SI_organization_name
        });
      }
    });
    return Array.from(uniqueOrgs.values());
  }, [data]);

  const getServiceLineOptions = (selectedOrgId) => {
    if (!selectedOrgId) return [];
    const selectedOrg = data.find(item => (item.SI_Organization_Details_id ? String(item.SI_Organization_Details_id) : '') === String(selectedOrgId));

    if (!selectedOrg || !selectedOrg.ServiceLines) return [];

    return selectedOrg.ServiceLines.map(sl => {
      const combination = `${sl.Business_Line_Name} : ${sl.Portfolio_Name} : ${sl.Service_Name}`;
      return {
        value: combination,
        label: combination
      };
    });
  };

  return { loading, error, organizationOptions, getServiceLineOptions };
};

const RicewRequestFormDetails = ({
  onClose,
  onBackToLanding,
  onBackToList,
  onLogout,
  selectedProject
}) => {
  const { handleAuthError } = useSession();
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
  const userId = localStorage.getItem('user_id') || '1';
  const createdBy = localStorage.getItem('user_id') || '1';
  const updatedBy = localStorage.getItem('user_id') || '1';

  const defaultFormData = {
    ricewId: '',
    ricewType: '',
    ricewName: '',
    ricewStatus: 'RICEW Requested',
    ricewDescription: '',
    // ** START OF NEW DEFAULT FIELDS **
    organizationId: '',
    organizationName: '',
    serviceLineName: '',
    ricewStatusDetail: 'RICEW Requested',
    complexity: '',
    ricewEffortHours: '',
    ricewCostCurrency: '',
    ricewCostAmount: '',
    rateCardName: '',
    // ** END OF NEW DEFAULT FIELDS **
    processStream: '',
    application: '',
    l0Process: '',
    module: [],
    crossStreamImpact: '',
    impactProcessStream: '',
    impactApplication: '',
    impactL0Process: '',
    impactModule: [],
    waveCode: '',
    waveName: '',
    rolloutCode: '',
    rolloutName: '',
    legalEntityName: '',
    legalEntityCode: '',
    businessOwnerName: '',
    businessOwnerEmail: '',
    functionalOwnerName: '',
    functionalOwnerEmail: '',
    technicalOwnerName: '',
    technicalOwnerEmail: '',
    notes: '',
    functionalSpecWriter: '',
    functionalSpecWriterEmail: '',
    functionalSpecApproval: '',
    technicalSpecWriter: '',
    technicalSpecWriterEmail: '',
    technicalSpecApproval: '',
    codeDeveloperUnitTesting: '',
    codeDeveloperUnitTestingEmail: '',
    functionalUnitTester: '',
    functionalUnitTesterEmail: '',
    functionalTestingApproval: '',
    createdByName: '',
    createdByEmail: '',
    lastUpdatedByName: '',
    lastUpdatedByEmail: ''
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
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
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  const lastToastShownRef = useRef('');
  const [touchedFields, setTouchedFields] = useState({});
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  const clearFieldError = (fieldName) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  };

  // Fetch LOV options for RICEW form
  const { options: rawRicewTypeOptions } = useLOV('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/objecttypes', 'objectType', 'objectType');

  // Mapped RICEW Type options
  const ricewTypeOptions = React.useMemo(() => {
    return (rawRicewTypeOptions || []).map(opt => ({
      ...opt,
      label: ricewTypeMapping[opt.label] || opt.label,
      value: ricewTypeMapping[opt.value] || opt.value
    }));
  }, [rawRicewTypeOptions]);

  // Use Resource Roster LOV for Owners
  const {
    loading: resourceRosterLoading,
    resourceRosterOptions
  } = useResourceRosterLOV(projectId);

  /*
  // Use Legal Entity LOV
  const {
    loading: legalEntityLoading,
    legalEntityOptions
  } = useLegalEntityLOV(projectId);
  */

  // Use RICEW Status LOV
  const {
    loading: ricewStatusLoading,
    ricewStatusOptions
  } = useRicewStatusLOV();

  // Use Cost Estimates Organizations LOV
  const {
    loading: costEstimatesOrganizationsLoading,
    costEstimatesOrganizationsOptions
  } = useCostEstimatesOrganizationsLOV();

  // State for selected organization in cost calculation
  const [selectedCostOrganization, setSelectedCostOrganization] = useState('');
  const [isCostOrgDropdownOpen, setIsCostOrgDropdownOpen] = useState(false);

  // Use Wave-Rollout cascading LOV
  const {
    loading: waveRolloutLoading,
    waveOptions,
    getRolloutOptions
  } = useWaveRolloutLOV(projectId);

  // Use Rate Card Names LOV
  const {
    loading: rateCardNamesLoading,
    rateCardNameOptions
  } = useRateCardNamesLOV(projectId);

  // Use Org Service Line LOV
  const {
    organizationOptions,
    getServiceLineOptions
  } = useOrgServiceLineLOV(projectId);

  // Auto-select organization if only one option exists
  useEffect(() => {
    if (!currentRecordId && organizationOptions && organizationOptions.length === 1) {
      setFormData(prev => {
        if (!prev.organizationId) {
          return {
            ...prev,
            organizationId: organizationOptions[0].value,
            organizationName: organizationOptions[0].label
          };
        }
        return prev;
      });
    }
  }, [organizationOptions, currentRecordId]);


  // Function to reload data from API
  const reloadRecordData = async () => {
    if (!currentRecordId) return;

    try {
      setDataLoading(true);
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        setDataLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const sanitizedRecordId = DOMPurify.sanitize(String(currentRecordId || '').trim(), { ALLOWED_TAGS: [] });
      const response = await fetch(`https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/get/byRICEWRequestFormId?RICEWRequestFormId=${sanitizedRecordId}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setDataLoading(false);
        return;
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Map API response fields to form fields
          const mappedData = {
            ricewId: result.data.RICEWRequestFormDisplayId || result.data.RICEWRequestFormId || '',
            ricewType: ricewTypeMapping[result.data.RICEW_Type] || result.data.RICEW_Type || '',
            ricewName: result.data.RICEW_Name || '',
            ricewStatus: result.data.RICEW_Status || '',
            ricewDescription: result.data.RICEW_Description || '',
            // ** START OF NEW FIELD MAPPINGS **
            organizationId: result.data.Org_Id ? String(result.data.Org_Id) : '',
            organizationName: organizationOptions.find(opt => opt.value === (result.data.Org_Id ? String(result.data.Org_Id) : ''))?.label || (result.data.Org_Id ? String(result.data.Org_Id) : ''),
            serviceLineName: result.data.Service_Line_Name || '',
            ricewStatusDetail: result.data.RICEW_Status || '',
            complexity: result.data.RICEW_Complexity || '',
            rateCardName: result.data.Rate_Card_Name || '',
            ricewEffortHours: result.data.RICEW_Effort_Hours || '',
            ricewCostCurrency: parseRicewCost(result.data.RICEW_Cost).currency,
            ricewCostAmount: parseRicewCost(result.data.RICEW_Cost).amount,
            // ** END OF NEW FIELD MAPPINGS **
            processStream: result.data.GI_Process_Stream || '',
            application: result.data.GI_Application || '',
            l0Process: result.data.GI_L0_Process || '',
            module: result.data.GI_Module ? result.data.GI_Module.split(', ').map(m => m.trim()).filter(m => m) : [],
            crossStreamImpact: result.data.Cross_Stream_Impact || '',
            impactProcessStream: result.data.CS_Process_Stream || '',
            impactApplication: result.data.CS_Application || '',
            impactL0Process: result.data.CS_L0_Process || '',
            impactModule: result.data.CS_Module ? result.data.CS_Module.split(', ').map(m => m.trim()).filter(m => m) : [],
            waveCode: result.data.Wave_Code || '',
            waveName: result.data.Wave_Name || '',
            rolloutCode: result.data.Rollout_Code || '',
            rolloutName: result.data.Rollout_Name || '',
            legalEntityCode: result.data.Legal_Entity_Code || '',
            legalEntityName: result.data.Legal_Entity_Name || '',
            businessOwnerName: result.data.Business_Owner_Name || '',
            businessOwnerEmail: result.data.Business_Owner_Email || '',
            functionalOwnerName: result.data.Functional_Owner_Email ?
              resourceRosterOptions?.find(opt => opt.email === result.data.Functional_Owner_Email)?.value || '' : '',
            functionalOwnerEmail: result.data.Functional_Owner_Email || '',
            technicalOwnerName: result.data.Technical_Owner_Email ?
              resourceRosterOptions?.find(opt => opt.email === result.data.Technical_Owner_Email)?.value || '' : '',
            technicalOwnerEmail: result.data.Technical_Owner_Email || '',
            notes: result.data.RICEW_Note || '',
            // For resource roster fields, find by email to get the Resource_Roster_Form_id
            functionalSpecWriter: result.data.Functional_Spec_Writer_Email ?
              resourceRosterOptions?.find(opt => opt.email === result.data.Functional_Spec_Writer_Email)?.value || '' : '',
            functionalSpecWriterEmail: result.data.Functional_Spec_Writer_Email || '',
            functionalSpecApproval: result.data.Functional_Specification_Approval || '',
            technicalSpecWriter: result.data.Technical_Spec_Writer_Email ?
              resourceRosterOptions?.find(opt => opt.email === result.data.Technical_Spec_Writer_Email)?.value || '' : '',
            technicalSpecWriterEmail: result.data.Technical_Spec_Writer_Email || '',
            technicalSpecApproval: result.data.Technical_Specification_Approval || '',
            codeDeveloperUnitTesting: result.data.Code_Deve_Unit_Testing_Email ?
              resourceRosterOptions?.find(opt => opt.email === result.data.Code_Deve_Unit_Testing_Email)?.value || '' : '',
            codeDeveloperUnitTestingEmail: result.data.Code_Deve_Unit_Testing_Email || '',
            functionalUnitTester: result.data.Functional_Unit_Tester_Email ?
              resourceRosterOptions?.find(opt => opt.email === result.data.Functional_Unit_Tester_Email)?.value || '' : '',
            functionalUnitTesterEmail: result.data.Functional_Unit_Tester_Email || '',
            functionalTestingApproval: result.data.Functional_Testing_Approval || '',
            createdByName: '',
            createdByEmail: '',
            lastUpdatedByName: '',
            lastUpdatedByEmail: ''
          };

          setFormData(mappedData);

          // Check if this record is a draft
          const isDraftRecord = result.data.saveDraft === 'true' || result.data.saveDraft === true;
          setIsDraft(isDraftRecord);
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

  // Load data from localStorage if editing existing record, or fetch from API if not available
  useEffect(() => {
    // Reset form state whenever formId changes to prevent data persistence from previous records
    setFormData(defaultFormData);
    setCurrentRecordId(null);
    setIsDraft(false);
    setFieldErrors({});
    setTouchedFields({});

    if (formId) {
      const storedData = localStorage.getItem('ricewFormData');
      if (storedData) {
        // Load from localStorage (after navigation from dashboard)
        try {
          const parsedData = JSON.parse(storedData);

          // Map API response fields to form fields
          const mappedData = {
            ricewId: parsedData.RICEWRequestFormDisplayId || parsedData.RICEWRequestFormId || '',
            ricewType: ricewTypeMapping[parsedData.RICEW_Type] || parsedData.RICEW_Type || '',
            ricewName: parsedData.RICEW_Name || '',
            ricewStatus: parsedData.RICEW_Status || '',
            ricewDescription: parsedData.RICEW_Description || '',
            // ** START OF NEW FIELD MAPPINGS **
            organizationId: parsedData.Org_Id ? String(parsedData.Org_Id) : '',
            organizationName: organizationOptions.find(opt => opt.value === (parsedData.Org_Id ? String(parsedData.Org_Id) : ''))?.label || (parsedData.Org_Id ? String(parsedData.Org_Id) : ''),
            serviceLineName: parsedData.Service_Line_Name || '',
            ricewStatusDetail: parsedData.RICEW_Status || '',
            complexity: parsedData.RICEW_Complexity || '',
            rateCardName: parsedData.Rate_Card_Name || '',
            ricewEffortHours: parsedData.RICEW_Effort_Hours || '',
            ricewCostCurrency: parseRicewCost(parsedData.RICEW_Cost).currency,
            ricewCostAmount: parseRicewCost(parsedData.RICEW_Cost).amount,
            // ** END OF NEW FIELD MAPPINGS **
            processStream: parsedData.GI_Process_Stream || '',
            application: parsedData.GI_Application || '',
            l0Process: parsedData.GI_L0_Process || '',
            module: parsedData.GI_Module ? parsedData.GI_Module.split(', ').map(m => m.trim()).filter(m => m) : [],
            crossStreamImpact: parsedData.Cross_Stream_Impact || '',
            impactProcessStream: parsedData.CS_Process_Stream || '',
            impactApplication: parsedData.CS_Application || '',
            impactL0Process: parsedData.CS_L0_Process || '',
            impactModule: parsedData.CS_Module ? parsedData.CS_Module.split(', ').map(m => m.trim()).filter(m => m) : [],
            waveCode: parsedData.Wave_Code || '',
            waveName: parsedData.Wave_Name || '',
            rolloutCode: parsedData.Rollout_Code || '',
            rolloutName: parsedData.Rollout_Name || '',
            legalEntityCode: parsedData.Legal_Entity_Code || '',
            legalEntityName: parsedData.Legal_Entity_Name || '',
            businessOwnerName: parsedData.Business_Owner_Name || '',
            businessOwnerEmail: parsedData.Business_Owner_Email || '',
            functionalOwnerName: parsedData.Functional_Owner_Email ?
              resourceRosterOptions?.find(opt => opt.email === parsedData.Functional_Owner_Email)?.value || '' : '',
            functionalOwnerEmail: parsedData.Functional_Owner_Email || '',
            technicalOwnerName: parsedData.Technical_Owner_Email ?
              resourceRosterOptions?.find(opt => opt.email === parsedData.Technical_Owner_Email)?.value || '' : '',
            technicalOwnerEmail: parsedData.Technical_Owner_Email || '',
            notes: parsedData.RICEW_Note || '',
            // For resource roster fields, find by email to get the Resource_Roster_Form_id
            functionalSpecWriter: parsedData.Functional_Spec_Writer_Email ?
              resourceRosterOptions?.find(opt => opt.email === parsedData.Functional_Spec_Writer_Email)?.value || '' : '',
            functionalSpecWriterEmail: parsedData.Functional_Spec_Writer_Email || '',
            functionalSpecApproval: parsedData.Functional_Specification_Approval || '',
            technicalSpecWriter: parsedData.Technical_Spec_Writer_Email ?
              resourceRosterOptions?.find(opt => opt.email === parsedData.Technical_Spec_Writer_Email)?.value || '' : '',
            technicalSpecWriterEmail: parsedData.Technical_Spec_Writer_Email || '',
            technicalSpecApproval: parsedData.Technical_Specification_Approval || '',
            codeDeveloperUnitTesting: parsedData.Code_Deve_Unit_Testing_Email ?
              resourceRosterOptions?.find(opt => opt.email === parsedData.Code_Deve_Unit_Testing_Email)?.value || '' : '',
            codeDeveloperUnitTestingEmail: parsedData.Code_Deve_Unit_Testing_Email || '',
            functionalUnitTester: parsedData.Functional_Unit_Tester_Email ?
              resourceRosterOptions?.find(opt => opt.email === parsedData.Functional_Unit_Tester_Email)?.value || '' : '',
            functionalUnitTesterEmail: parsedData.Functional_Unit_Tester_Email || '',
            functionalTestingApproval: parsedData.Functional_Testing_Approval || '',
            createdByName: '',
            createdByEmail: '',
            lastUpdatedByName: '',
            lastUpdatedByEmail: ''
          };

          setFormData(mappedData);
          setCurrentRecordId(parsedData.RICEWRequestFormId);

          // Check if this record is a draft
          const isDraftRecord = parsedData.saveDraft === 'true' || parsedData.saveDraft === true;
          setIsDraft(isDraftRecord);

          // Clear the stored data after loading
          localStorage.removeItem('ricewFormData');
        } catch (error) {
          console.error('Error loading stored form data:', error);
        }
      } else {
        // No localStorage data, fetch from API directly (e.g., page refresh)
        const fetchRecordData = async () => {
          try {
            setDataLoading(true);
            // Get ID token for authorization
            let idToken = null;
            try {
              idToken = await getIdToken();
            } catch (tokenError) {
              console.error('Failed to get ID token for fetching record:', tokenError);
            }

            const headers = {
              'Content-Type': 'application/json',
            };

            if (idToken) {
              headers['Authorization'] = `Bearer ${idToken}`;
            }

            const response = await fetch(`https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/get/byRICEWRequestFormId?RICEWRequestFormId=${formId}`, {
              headers: headers
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                // Map API response fields to form fields
                const mappedData = {
                  ricewId: result.data.RICEWRequestFormDisplayId || result.data.RICEWRequestFormId || '',
                  ricewType: ricewTypeMapping[result.data.RICEW_Type] || result.data.RICEW_Type || '',
                  ricewName: result.data.RICEW_Name || '',
                  ricewStatus: result.data.RICEW_Status || '',
                  ricewDescription: result.data.RICEW_Description || '',
                  // ** START OF NEW FIELD MAPPINGS **
                  organizationId: result.data.Org_Id ? String(result.data.Org_Id) : '',
                  organizationName: organizationOptions.find(opt => opt.value === (result.data.Org_Id ? String(result.data.Org_Id) : ''))?.label || (result.data.Org_Id ? String(result.data.Org_Id) : ''),
                  serviceLineName: result.data.Service_Line_Name || '',
                  ricewStatusDetail: result.data.RICEW_Status || '',
                  complexity: result.data.RICEW_Complexity || '',
                  rateCardName: result.data.Rate_Card_Name || '',
                  ricewEffortHours: result.data.RICEW_Effort_Hours || '',
                  ricewCostCurrency: parseRicewCost(result.data.RICEW_Cost).currency,
                  ricewCostAmount: parseRicewCost(result.data.RICEW_Cost).amount,
                  // ** END OF NEW FIELD MAPPINGS **
                  processStream: result.data.GI_Process_Stream || '',
                  application: result.data.GI_Application || '',
                  l0Process: result.data.GI_L0_Process || '',
                  module: result.data.GI_Module ? result.data.GI_Module.split(', ').map(m => m.trim()).filter(m => m) : [],
                  crossStreamImpact: result.data.Cross_Stream_Impact || '',
                  impactProcessStream: result.data.CS_Process_Stream || '',
                  impactApplication: result.data.CS_Application || '',
                  impactL0Process: result.data.CS_L0_Process || '',
                  impactModule: result.data.CS_Module ? result.data.CS_Module.split(', ').map(m => m.trim()).filter(m => m) : [],
                  waveCode: result.data.Wave_Code || '',
                  waveName: result.data.Wave_Name || '',
                  rolloutCode: result.data.Rollout_Code || '',
                  rolloutName: result.data.Rollout_Name || '',
                  legalEntityCode: result.data.Legal_Entity_Code || '',
                  legalEntityName: result.data.Legal_Entity_Name || '',
                  businessOwnerName: result.data.Business_Owner_Name || '',
                  businessOwnerEmail: result.data.Business_Owner_Email || '',
                  functionalOwnerName: result.data.Functional_Owner_Email ?
                    resourceRosterOptions?.find(opt => opt.email === result.data.Functional_Owner_Email)?.value || '' : '',
                  functionalOwnerEmail: result.data.Functional_Owner_Email || '',
                  technicalOwnerName: result.data.Technical_Owner_Email ?
                    resourceRosterOptions?.find(opt => opt.email === result.data.Technical_Owner_Email)?.value || '' : '',
                  technicalOwnerEmail: result.data.Technical_Owner_Email || '',
                  notes: result.data.RICEW_Note || '',
                  // For resource roster fields, find by email to get the Resource_Roster_Form_id
                  functionalSpecWriter: result.data.Functional_Spec_Writer_Email ?
                    resourceRosterOptions?.find(opt => opt.email === result.data.Functional_Spec_Writer_Email)?.value || '' : '',
                  functionalSpecWriterEmail: result.data.Functional_Spec_Writer_Email || '',
                  functionalSpecApproval: result.data.Functional_Specification_Approval || '',
                  technicalSpecWriter: result.data.Technical_Spec_Writer_Email ?
                    resourceRosterOptions?.find(opt => opt.email === result.data.Technical_Spec_Writer_Email)?.value || '' : '',
                  technicalSpecWriterEmail: result.data.Technical_Spec_Writer_Email || '',
                  technicalSpecApproval: result.data.Technical_Specification_Approval || '',
                  codeDeveloperUnitTesting: result.data.Code_Deve_Unit_Testing_Email ?
                    resourceRosterOptions?.find(opt => opt.email === result.data.Code_Deve_Unit_Testing_Email)?.value || '' : '',
                  codeDeveloperUnitTestingEmail: result.data.Code_Deve_Unit_Testing_Email || '',
                  functionalUnitTester: result.data.Functional_Unit_Tester_Email ?
                    resourceRosterOptions?.find(opt => opt.email === result.data.Functional_Unit_Tester_Email)?.value || '' : '',
                  functionalUnitTesterEmail: result.data.Functional_Unit_Tester_Email || '',
                  functionalTestingApproval: result.data.Functional_Testing_Approval || '',
                  createdByName: '',
                  createdByEmail: '',
                  lastUpdatedByName: '',
                  lastUpdatedByEmail: ''
                };

                setFormData(mappedData);
                setCurrentRecordId(result.data.RICEWRequestFormId);

                // Check if this record is a draft
                const isDraftRecord = result.data.saveDraft === 'true' || result.data.saveDraft === true;
                setIsDraft(isDraftRecord);
              } else {
                console.error('Failed to fetch record data:', result);
              }
            } else {
              console.error('Failed to fetch record data from API');
            }
          } catch (error) {
            console.error('Error fetching record data:', error);
          } finally {
            setDataLoading(false);
          }
        };

        fetchRecordData();
      }
    }
  }, [formId]);

  // Update resource roster and approval fields when LOV options become available
  useEffect(() => {
    if (formData.functionalOwnerEmail || formData.technicalOwnerEmail ||
      formData.functionalSpecWriterEmail || formData.technicalSpecWriterEmail ||
      formData.codeDeveloperUnitTestingEmail || formData.functionalUnitTesterEmail) {

      const updates = {};
      let hasUpdates = false;

      // Update Functional Owner if we have email but no ID
      if (formData.functionalOwnerEmail && !formData.functionalOwnerName && resourceRosterOptions.length > 0) {
        const match = resourceRosterOptions.find(opt => opt.email === formData.functionalOwnerEmail);
        if (match) {
          updates.functionalOwnerName = match.value;
          hasUpdates = true;
        }
      }

      // Update Technical Owner if we have email but no ID
      if (formData.technicalOwnerEmail && !formData.technicalOwnerName && resourceRosterOptions.length > 0) {
        const match = resourceRosterOptions.find(opt => opt.email === formData.technicalOwnerEmail);
        if (match) {
          updates.technicalOwnerName = match.value;
          hasUpdates = true;
        }
      }

      // Update Functional Spec Writer if we have email but no ID
      if (formData.functionalSpecWriterEmail && !formData.functionalSpecWriter && resourceRosterOptions.length > 0) {
        const match = resourceRosterOptions.find(opt => opt.email === formData.functionalSpecWriterEmail);
        if (match) {
          updates.functionalSpecWriter = match.value;
          hasUpdates = true;
        }
      }

      // Update Technical Spec Writer if we have email but no ID
      if (formData.technicalSpecWriterEmail && !formData.technicalSpecWriter && resourceRosterOptions.length > 0) {
        const match = resourceRosterOptions.find(opt => opt.email === formData.technicalSpecWriterEmail);
        if (match) {
          updates.technicalSpecWriter = match.value;
          hasUpdates = true;
        }
      }

      // Update Code Developer if we have email but no ID
      if (formData.codeDeveloperUnitTestingEmail && !formData.codeDeveloperUnitTesting && resourceRosterOptions.length > 0) {
        const match = resourceRosterOptions.find(opt => opt.email === formData.codeDeveloperUnitTestingEmail);
        if (match) {
          updates.codeDeveloperUnitTesting = match.value;
          hasUpdates = true;
        }
      }

      // Update Functional Unit Tester if we have email but no ID
      if (formData.functionalUnitTesterEmail && !formData.functionalUnitTester && resourceRosterOptions.length > 0) {
        const match = resourceRosterOptions.find(opt => opt.email === formData.functionalUnitTesterEmail);
        if (match) {
          updates.functionalUnitTester = match.value;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [resourceRosterOptions, formData.functionalOwnerEmail, formData.technicalOwnerEmail,
    formData.functionalSpecWriterEmail, formData.technicalSpecWriterEmail,
    formData.codeDeveloperUnitTestingEmail, formData.functionalUnitTesterEmail]);

  // Use cascading LOV for process stream hierarchy
  const {
    processStreamOptions,
    getApplicationOptions,
    getL0ProcessOptions,
    getModuleOptions
  } = useCascadingLOV();
  const applicationOptions = getApplicationOptions(formData.processStream);
  const l0ProcessOptions = getL0ProcessOptions(formData.processStream, formData.application);
  const moduleOptions = getModuleOptions(formData.processStream, formData.application);

  // Also get options for cross-stream impact (same hierarchy)
  const impactApplicationOptions = getApplicationOptions(formData.impactProcessStream);
  const impactL0ProcessOptions = getL0ProcessOptions(formData.impactProcessStream, formData.impactApplication);
  const impactModuleOptions = getModuleOptions(formData.impactProcessStream, formData.impactApplication);
  // Get rollout options based on selected wave
  const rolloutOptions = getRolloutOptions(formData.waveCode);

  // Get service line options based on selected organization
  const serviceLineOptions = getServiceLineOptions(formData.organizationId);

  const lovOptions = {
    ricewType: ricewTypeOptions || [],
    ricewStatus: ricewStatusOptions || [],
    rateCardName: rateCardNameOptions || [],
    processStream: processStreamOptions || [],
    application: applicationOptions || [],
    l0Process: l0ProcessOptions || [],
    module: moduleOptions || [],
    wave: waveOptions || [],
    rollout: rolloutOptions || [],
    // legalEntity: legalEntityOptions || [],
    organization: organizationOptions || [],
    serviceLine: serviceLineOptions || []
  };

  // Add cross-stream impact options to lovOptions
  const crossStreamLovOptions = {
    ...lovOptions,
    processStream: processStreamOptions || [], // Same process streams for impact
    application: impactApplicationOptions || [],
    l0Process: impactL0ProcessOptions || [],
    module: impactModuleOptions || []
  };

  // Helper function to get display value from LOV options by ID
  const getDisplayValue = (id, options) => {
    if (!id || !options) return '';
    const option = options.find(opt => opt.value === id);
    return option ? option.label : '';
  };

  // Get display values for form submission
  const getProcessStreamDisplay = (id) => getDisplayValue(id, processStreamOptions);
  const getApplicationDisplay = (id) => getDisplayValue(id, applicationOptions);
  const getL0ProcessDisplay = (id) => getDisplayValue(id, l0ProcessOptions);
  const getModuleDisplay = (id) => getDisplayValue(id, moduleOptions);
  const getWaveDisplay = (id) => getDisplayValue(id, waveOptions);
  const getRolloutDisplay = (id) => getDisplayValue(id, rolloutOptions);
  /*
  const getLegalEntityDisplay = (id) => {
    if (!id || !legalEntityOptions) return '';
    const option = legalEntityOptions.find(opt => opt.value === id);
    return option ? option.name : '';
  };
  */
  const handleInputChange = (fieldName, value) => {
    // Handle RICEW Name and Business Owner Name - validate allowed characters, capitalize first character and enforce 100 char limit
    if (fieldName === 'ricewName' || fieldName === 'businessOwnerName') {
      // Allow only: A-Z, a-z, 0-9, space, &, -, ., ,, ', (), /
      const allowedCharsRegex = /^[A-Za-z0-9 &\-.,\'()\/]*$/;

      if (!allowedCharsRegex.test(value)) {
        // If the value contains invalid characters, don't update (silently reject)
        return;
      }

      // If value exceeds 100 characters, trim it and show error
      if (value.length > 100) {
        value = value.substring(0, 100);
        const errorMessage = fieldName === 'ricewName'
          ? 'RICEW Name cannot exceed 100 characters'
          : 'Business Owner Name cannot exceed 100 characters';
        setFieldErrors(prev => ({
          ...prev,
          [fieldName]: errorMessage
        }));
      }
      // Capitalize the first character
      if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
      }
    }

    // Handle RICEW Description - capitalize first character and enforce 240 char limit
    if (fieldName === 'ricewDescription') {
      // If value exceeds 240 characters, trim it and show error
      if (value.length > 240) {
        value = value.substring(0, 240);
        setFieldErrors(prev => ({
          ...prev,
          ricewDescription: 'RICEW Description cannot exceed 240 characters'
        }));
      }
      // Capitalize the first character
      if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
      }
    }

    // Handle Email fields - enforce 100 char limit (validation happens on blur)
    if (fieldName === 'businessOwnerEmail' || fieldName === 'functionalOwnerEmail' || fieldName === 'technicalOwnerEmail') {
      // If value exceeds 100 characters, trim it and show error
      if (value.length > 100) {
        value = value.substring(0, 100);
        setFieldErrors(prev => ({
          ...prev,
          [fieldName]: 'Email cannot exceed 100 characters'
        }));
      } else {
        // Clear error while typing (validation will happen on blur)
        if (fieldErrors[fieldName]) {
          setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
          });
        }
      }
    }

    setFormData(prev => {
      // If value hasn't changed, return previous state to avoid unnecessary re-renders and cascading clears
      if (prev[fieldName] === value) {
        return prev;
      }
      const newData = { ...prev, [fieldName]: value };

      /*
      // Auto-populate Legal Entity Name when Legal Entity Code is selected
      if (fieldName === 'legalEntityCode') {
        const selectedEntity = legalEntityOptions?.find(opt => opt.value === value);
        if (selectedEntity) {
          newData.legalEntityName = selectedEntity.name || '';
        } else {
          newData.legalEntityName = '';
        }
      }
      */
      // Auto-populate Wave Name when Wave Code is selected and clear Rollout
      if (fieldName === 'waveCode') {
        const selectedWave = waveOptions?.find(opt => (opt.code || opt.value) === value);
        if (selectedWave) {
          newData.waveName = selectedWave.label || '';
        } else {
          newData.waveName = '';
        }
        // Clear rollout when wave changes
        newData.rolloutCode = '';
        newData.rolloutName = '';
      }
      // Auto-populate Rollout Name when Rollout Code is selected
      else if (fieldName === 'rolloutCode') {
        const selectedRollout = getRolloutOptions(newData.waveCode)?.find(opt => (opt.code || opt.value) === value);
        if (selectedRollout) {
          newData.rolloutName = selectedRollout.label || '';
        } else {
          newData.rolloutName = '';
        }
      }
      // Auto-populate Functional Owner Email when Functional Owner Name is selected
      else if (fieldName === 'functionalOwnerName') {
        const selectedOwner = resourceRosterOptions?.find(opt => opt.value === value);
        if (selectedOwner) {
          newData.functionalOwnerEmail = selectedOwner.email || '';
        } else {
          newData.functionalOwnerEmail = '';
        }
      }
      // Auto-populate Technical Owner Email when Technical Owner Name is selected
      else if (fieldName === 'technicalOwnerName') {
        const selectedOwner = resourceRosterOptions?.find(opt => opt.value === value);
        if (selectedOwner) {
          newData.technicalOwnerEmail = selectedOwner.email || '';
        } else {
          newData.technicalOwnerEmail = '';
        }
      }
      // Auto-populate Functional Spec Writer Email when Resource_Roster_Form_id is selected
      else if (fieldName === 'functionalSpecWriter') {
        const selectedResource = resourceRosterOptions?.find(opt => opt.value === value);
        if (selectedResource) {
          newData.functionalSpecWriterEmail = selectedResource.email || '';
        } else {
          newData.functionalSpecWriterEmail = '';
        }
      }
      // Auto-populate Technical Spec Writer Email when Resource_Roster_Form_id is selected
      else if (fieldName === 'technicalSpecWriter') {
        const selectedResource = resourceRosterOptions?.find(opt => opt.value === value);
        if (selectedResource) {
          newData.technicalSpecWriterEmail = selectedResource.email || '';
        } else {
          newData.technicalSpecWriterEmail = '';
        }
      }
      // Auto-populate Code Developer & Unit Testing Email when Resource_Roster_Form_id is selected
      else if (fieldName === 'codeDeveloperUnitTesting') {
        const selectedResource = resourceRosterOptions?.find(opt => opt.value === value);
        if (selectedResource) {
          newData.codeDeveloperUnitTestingEmail = selectedResource.email || '';
        } else {
          newData.codeDeveloperUnitTestingEmail = '';
        }
      }
      // Auto-populate Functional Unit Tester Email when Resource_Roster_Form_id is selected
      else if (fieldName === 'functionalUnitTester') {
        const selectedResource = resourceRosterOptions?.find(opt => opt.value === value);
        if (selectedResource) {
          newData.functionalUnitTesterEmail = selectedResource.email || '';
        } else {
          newData.functionalUnitTesterEmail = '';
        }
      }
      // Cascading logic: clear dependent fields when parent changes
      else if (fieldName === 'processStream') {
        // Clear application, l0Process, and module when process stream changes
        newData.application = '';
        newData.l0Process = '';
        newData.module = [];
        if (newData.crossStreamImpact === 'No') {
          newData.impactProcessStream = value;
          newData.impactApplication = '';
          newData.impactL0Process = '';
          newData.impactModule = [];
        }
      } else if (fieldName === 'application') {
        // Clear l0Process and module when application changes
        newData.l0Process = '';
        newData.module = [];
        if (newData.crossStreamImpact === 'No') {
          newData.impactApplication = value;
          newData.impactL0Process = '';
          newData.impactModule = [];
        }
      } else if (fieldName === 'l0Process') {
        if (newData.crossStreamImpact === 'No') {
          newData.impactL0Process = value;
          newData.impactModule = [];
        }
      } else if (fieldName === 'module') {
        if (newData.crossStreamImpact === 'No') {
          newData.impactModule = value;
        }
      } else if (fieldName === 'crossStreamImpact') {
        if (value === 'No') {
          // Mirror selections to impact fields when user indicates No cross stream impact
          newData.impactProcessStream = newData.processStream || '';
          newData.impactApplication = newData.application || '';
          newData.impactL0Process = newData.l0Process || '';
          newData.impactModule = newData.module || [];
        } else {
          // Reset impact fields when user selects Yes/clears
          newData.impactProcessStream = '';
          newData.impactApplication = '';
          newData.impactL0Process = '';
          newData.impactModule = [];
        }
      } else if (fieldName === 'impactProcessStream') {
        // Clear impact application, l0Process, and module when impact process stream changes
        newData.impactApplication = '';
        newData.impactL0Process = '';
        newData.impactModule = [];
      } else if (fieldName === 'impactApplication') {
        // Clear impact l0Process and module when impact application changes
        newData.impactL0Process = '';
        newData.impactModule = [];
      } else if (fieldName === 'organizationId') {
        const selectedOrg = organizationOptions?.find(opt => opt.value === value);
        if (selectedOrg) {
          newData.organizationName = selectedOrg.label || '';
        } else {
          newData.organizationName = '';
        }
        newData.serviceLineName = '';
      }

      if (fieldErrors[fieldName]) {
        clearFieldError(fieldName);
      }

      return newData;
    });
  };

  // Handle field blur for email validation
  const handleFieldBlur = (fieldName) => {
    // Validate email fields on blur
    if (fieldName === 'businessOwnerEmail' || fieldName === 'functionalOwnerEmail' || fieldName === 'technicalOwnerEmail') {
      const value = formData[fieldName];

      if (value && value.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          setFieldErrors(prev => ({
            ...prev,
            [fieldName]: 'Please enter a valid email address'
          }));
        }
      }
    }

    // Mark field as touched
    setTouchedFields(prev => ({
      ...prev,
      [fieldName]: true
    }));
  };

  // Handle Calculate button click
  const handleCalculate = async () => {
    try {
      // Validate all required fields for calculation
      const missingFields = [];
      if (!formData.complexity) missingFields.push('Complexity');
      if (!formData.ricewType) missingFields.push('RICEW Type');
      if (!formData.organizationId) missingFields.push('Organization');
      if (!formData.serviceLineName) missingFields.push('Service Line');

      if (missingFields.length > 0) {
        setErrorMessage(`Please select ${missingFields.join(', ')} to calculate`);
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }

      setCalculating(true);

      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        setCalculating(false);
        return;
      }

      const estimationName = ricewTypeMapping[formData.ricewType] || formData.ricewType;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      // Prepare query parameters with sanitization
      const queryParams = new URLSearchParams({
        project_id: DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] }),
        Estimation_Name: DOMPurify.sanitize(String(estimationName || '').trim(), { ALLOWED_TAGS: [] }),
        ComplexityType: DOMPurify.sanitize(String(formData.complexity || '').trim(), { ALLOWED_TAGS: [] }),
        organization_id: DOMPurify.sanitize(String(formData.organizationId || '').trim(), { ALLOWED_TAGS: [] }),
        Service_Line_name: DOMPurify.sanitize(String(formData.serviceLineName || '').trim(), { ALLOWED_TAGS: [] })
      });

      console.log('Calling getByHoursAndCostEstimation API with params:', queryParams.toString());

      const response = await fetch(`https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRateCardProjection/getByHoursAndCostEstimation?${queryParams.toString()}`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setCalculating(false);
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('getByHoursAndCostEstimation API response:', result.data);

        // Update form fields with sanitized response data
        setFormData(prev => ({
          ...prev,
          ricewEffortHours: DOMPurify.sanitize(String(result.data.Effort_Hours || '').trim(), { ALLOWED_TAGS: [] }),
          ricewCostCurrency: DOMPurify.sanitize(String(result.data.Currency || '').trim(), { ALLOWED_TAGS: [] }),
          ricewCostAmount: DOMPurify.sanitize(String(result.data.Cost || '').trim(), { ALLOWED_TAGS: [] })
        }));

        setSuccessMessage('Successfully calculated cost and hours');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error(result.error || result.message || 'Failed to calculate cost and hours');
      }
    } catch (error) {
      console.error('Error calculating cost:', error);
      setErrorMessage(error.message || 'Failed to calculate cost. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    } finally {
      setCalculating(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const errors = {};
    if (!formData.ricewType) errors.ricewType = 'RICEW Type is required';
    if (!formData.ricewName) errors.ricewName = 'RICEW Name is required';
    else if (formData.ricewName.length > 100) errors.ricewName = 'RICEW Name cannot exceed 100 characters';
    if (!formData.ricewDescription) errors.ricewDescription = 'RICEW Description is required';
    else if (formData.ricewDescription.length > 240) errors.ricewDescription = 'RICEW Description cannot exceed 240 characters';
    if (!formData.processStream) errors.processStream = 'Process Stream is required';
    // if (!formData.application) errors.application = 'Application is required';
    /* // Commented out mandatory field validation as per request
    if (!formData.l0Process) errors.l0Process = 'L0 Process is required';
    if (!formData.module || formData.module.length === 0) errors.module = 'At least one module is required';
    */
    // if (!formData.crossStreamImpact) errors.crossStreamImpact = 'Cross Stream Impact is required';

    // Cross-stream impact fields are always required
    /* 
    if (!formData.impactProcessStream) errors.impactProcessStream = 'Impact Process Stream is required';
    if (!formData.impactApplication) errors.impactApplication = 'Impact Application is required';
    if (!formData.impactL0Process) errors.impactL0Process = 'Impact L0 Process is required';
    if (!formData.impactModule || formData.impactModule.length === 0) errors.impactModule = 'Impact Module is required';

    if (!formData.waveCode) errors.waveCode = 'Wave Code is required';
    if (!formData.waveName) errors.waveName = 'Wave Name is required';
    if (!formData.rolloutCode) errors.rolloutCode = 'Rollout Code is required';
    if (!formData.rolloutName) errors.rolloutName = 'Rollout Name is required';
    if (!formData.legalEntityCode) errors.legalEntityCode = 'Legal Entity Code is required';
    if (!formData.legalEntityName) errors.legalEntityName = 'Legal Entity Name is required';
    if (!formData.businessOwnerName) errors.businessOwnerName = 'Business Owner Name is required';
    else if (formData.businessOwnerName.length > 100) errors.businessOwnerName = 'Business Owner Name cannot exceed 100 characters';
    if (!formData.businessOwnerEmail) errors.businessOwnerEmail = 'Business Owner Email is required';
    else if (formData.businessOwnerEmail.length > 100) errors.businessOwnerEmail = 'Email cannot exceed 100 characters';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessOwnerEmail)) errors.businessOwnerEmail = 'Please enter a valid email address';
    if (!formData.functionalOwnerName) errors.functionalOwnerName = 'Functional Owner Name is required';
    if (!formData.functionalOwnerEmail) errors.functionalOwnerEmail = 'Functional Owner Email is required';
    else if (formData.functionalOwnerEmail.length > 100) errors.functionalOwnerEmail = 'Email cannot exceed 100 characters';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.functionalOwnerEmail)) errors.functionalOwnerEmail = 'Please enter a valid email address';
    if (!formData.technicalOwnerName) errors.technicalOwnerName = 'Technical Owner Name is required';
    if (!formData.technicalOwnerEmail) errors.technicalOwnerEmail = 'Technical Owner Email is required';
    else if (formData.technicalOwnerEmail.length > 100) errors.technicalOwnerEmail = 'Email cannot exceed 100 characters';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.technicalOwnerEmail)) errors.technicalOwnerEmail = 'Please enter a valid email address';
    */
    // ** START OF STATUS & EFFORT INFORMATION VALIDATIONS - ALL REQUIRED **
    // if (!formData.ricewStatusDetail) errors.ricewStatusDetail = 'RICEW Status is required';
    if (!formData.complexity) errors.complexity = 'Complexity is required';
    if (!formData.ricewEffortHours) errors.ricewEffortHours = 'Effort Hours is required';
    else if (isNaN(formData.ricewEffortHours) || parseFloat(formData.ricewEffortHours) <= 0) errors.ricewEffortHours = 'Effort Hours must be a positive number';
    if (!formData.ricewCostCurrency) errors.ricewCostCurrency = 'RICEW Cost Currency is required';
    if (!formData.ricewCostAmount) errors.ricewCostAmount = 'RICEW Cost Amount is required';
    else if (isNaN(formData.ricewCostAmount) || parseFloat(formData.ricewCostAmount) <= 0) errors.ricewCostAmount = 'RICEW Cost Amount must be a positive number';
    // ** END OF STATUS & EFFORT INFORMATION VALIDATIONS **

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please fill in all required fields');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    setLoading(true);
    try {
      // Map formData to backend expected field names
      const requestData = {
        RICEWRequestFormId: currentRecordId || undefined, // Include for updates
        RICEW_Name: formData.ricewName,
        RICEW_Type: getBackendRicewType(formData.ricewType), // Robust matching
        RICEW_Description: formData.ricewDescription || '',
        // ** START OF NEW FIELDS **
        RICEW_Status: currentRecordId ? formData.ricewStatusDetail || '' : 'Approval Pending', // Send 'Approval Pending' for new records, keep selected value for updates
        RICEW_Complexity: formData.complexity || '',
        RICEW_Effort_Hours: formData.ricewEffortHours || '',
        RICEW_Cost: `${formData.ricewCostCurrency || ''} ${formData.ricewCostAmount || ''}`.trim(),
        Org_Id: formData.organizationId || '',
        Service_Line_Name: formData.serviceLineName || '',
        // ** END OF NEW FIELDS **
        GI_Process_Stream: formData.processStream || '',
        GI_Application: formData.application || '',
        GI_L0_Process: formData.l0Process || '',
        GI_Module: Array.isArray(formData.module) ? formData.module.join(', ') : formData.module || '',
        Cross_Stream_Impact: formData.crossStreamImpact || '',
        CS_Process_Stream: formData.impactProcessStream || '',
        CS_Application: formData.impactApplication || '',
        CS_L0_Process: formData.impactL0Process || '',
        CS_Module: Array.isArray(formData.impactModule) ? formData.impactModule.join(', ') : formData.impactModule || '',
        Wave_Code: formData.waveCode || '',
        Wave_Name: formData.waveName || '',
        Rollout_Code: formData.rolloutCode || '',
        Rollout_Name: formData.rolloutName || '',
        // Legal_Entity_Code: formData.legalEntityCode || '',
        // Legal_Entity_Name: getLegalEntityDisplay(formData.legalEntityCode) || '',
        Business_Owner_Name: formData.businessOwnerName || '',
        Business_Owner_Email: formData.businessOwnerEmail || '',
        Functional_Owner_Name: resourceRosterOptions?.find(opt => opt.value === formData.functionalOwnerName)?.label || '',
        Functional_Owner_Email: formData.functionalOwnerEmail || '',
        Technical_Owner_Name: resourceRosterOptions?.find(opt => opt.value === formData.technicalOwnerName)?.label || '',
        Technical_Owner_Email: formData.technicalOwnerEmail || '',
        RICEW_Note: formData.notes || '',
        // ** RESOURCE ROSTER ROLES WITH EMAILS **
        // Extract names from emails (values) for backend
        Functional_Spec_Writer: resourceRosterOptions?.find(opt => opt.value === formData.functionalSpecWriter)?.label || '',
        Functional_Spec_Writer_Email: formData.functionalSpecWriterEmail || '',
        Technical_Spec_Writer: resourceRosterOptions?.find(opt => opt.value === formData.technicalSpecWriter)?.label || '',
        Technical_Spec_Writer_Email: formData.technicalSpecWriterEmail || '',
        Code_Deve_Unit_Testing: resourceRosterOptions?.find(opt => opt.value === formData.codeDeveloperUnitTesting)?.label || '',
        Code_Deve_Unit_Testing_Email: formData.codeDeveloperUnitTestingEmail || '',
        Functional_Unit_Tester: resourceRosterOptions?.find(opt => opt.value === formData.functionalUnitTester)?.label || '',
        Functional_Unit_Tester_Email: formData.functionalUnitTesterEmail || '',
        // ** APPROVAL FIELDS **
        Functional_Specification_Approval: formData.functionalSpecApproval || '',
        Technical_Specification_Approval: formData.technicalSpecApproval || '',
        Functional_Testing_Approval: formData.functionalTestingApproval || '',
        Project_id: projectId,
        user_id: userId,
        created_by: createdBy,
        updated_by: updatedBy,
        saveDraft: false // Regular submit, not draft
      };

      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      // Sanitize critical fields in requestData before sending
      const sanitizeRequestData = (data) => ({
        ...data,
        RICEWRequestFormId: data.RICEWRequestFormId ? DOMPurify.sanitize(String(data.RICEWRequestFormId).trim(), { ALLOWED_TAGS: [] }) : data.RICEWRequestFormId,
        RICEW_Name: DOMPurify.sanitize(String(data.RICEW_Name || '').trim(), { ALLOWED_TAGS: [] }),
        RICEW_Type: DOMPurify.sanitize(String(data.RICEW_Type || '').trim(), { ALLOWED_TAGS: [] }),
        Project_id: DOMPurify.sanitize(String(data.Project_id || '').trim(), { ALLOWED_TAGS: [] }),
        user_id: DOMPurify.sanitize(String(data.user_id || '').trim(), { ALLOWED_TAGS: [] })
      });

      const response = await fetch(currentRecordId
        ? 'https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/update/ricew-request-form'
        : 'https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/post/ricew-request-form', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(sanitizeRequestData(requestData))
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        let errorMsg = currentRecordId ? 'Failed to update RICEW Request' : 'Failed to create RICEW Request';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) { }
        throw new Error(errorMsg);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.displayId) {
        setFormData(prev => ({
          ...prev,
          ricewId: result.data.displayId
        }));
      }

      setSuccessMessage(currentRecordId ? 'RICEW Request updated successfully!' : 'RICEW Request created successfully!');
      setShowSuccessMessage(true);

      // Set refresh flag for dashboard
      sessionStorage.setItem('ricew_refresh_needed', 'true');
      setTimeout(async () => {
        setShowSuccessMessage(false);
        // Only clear form data and navigate for new record creation, not updates
        if (!currentRecordId) {
          // Clear form data
          setFormData({ ...defaultFormData });
          setFieldErrors({});
          // Navigate back to dashboard
          if (onBackToList) {
            onBackToList();
          } else {
            if (window.location.search.includes('from=approval')) {
              navigate('/dashboard/approval-dashboard');
            } else {
              navigate('/dashboard/ricew-dashboard');
            }
          }
        } else {
          // For updates, reload the data from API to get the latest changes
          await reloadRecordData();
        }
      }, 2000);
    } catch (error) {
      console.error('Error submitting RICEW Request:', error);
      setErrorMessage(error.message || `Error ${currentRecordId ? 'updating' : 'creating'} RICEW Request. Please try again.`);
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    // Validate required fields for draft (only RICEW Name and Description)
    const errors = {};
    if (!formData.ricewName) errors.ricewName = 'RICEW Name is required';
    else if (formData.ricewName.length > 100) errors.ricewName = 'RICEW Name cannot exceed 100 characters';
    if (!formData.ricewDescription) errors.ricewDescription = 'RICEW Description is required';
    else if (formData.ricewDescription.length > 240) errors.ricewDescription = 'RICEW Description cannot exceed 240 characters';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please fill in RICEW Name and Description to save draft');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    setLoading(true);
    try {
      // Build request data - send display names directly
      const requestData = {
        RICEWRequestFormId: currentRecordId || undefined, // Include for updates
        Project_id: projectId,
        user_id: userId,
        created_by: createdBy,
        updated_by: updatedBy,
        saveDraft: 'true', // Save as draft (string)
        RICEW_Name: formData.ricewName || '',
        RICEW_Type: getBackendRicewType(formData.ricewType),
        RICEW_Description: formData.ricewDescription || '',
        // ** START OF NEW FIELDS **
        RICEW_Status: formData.ricewStatusDetail || '',
        RICEW_Complexity: formData.complexity || '',
        RICEW_Effort_Hours: formData.ricewEffortHours || '',
        RICEW_Cost: `${formData.ricewCostCurrency || ''} ${formData.ricewCostAmount || ''}`.trim(),
        Org_Id: formData.organizationId || '',
        Service_Line_Name: formData.serviceLineName || '',
        // ** END OF NEW FIELDS **
        GI_Process_Stream: formData.processStream || '',
        GI_Application: formData.application || '',
        GI_L0_Process: formData.l0Process || '',
        GI_Module: Array.isArray(formData.module) ? formData.module.join(', ') : formData.module || '',
        Cross_Stream_Impact: formData.crossStreamImpact || '',
        CS_Process_Stream: formData.impactProcessStream || '',
        CS_Application: formData.impactApplication || '',
        CS_L0_Process: formData.impactL0Process || '',
        CS_Module: Array.isArray(formData.impactModule) ? formData.impactModule.join(', ') : formData.impactModule || '',
        Wave_Code: formData.waveCode || '',
        Wave_Name: formData.waveName || '',
        Rollout_Code: formData.rolloutCode || '',
        Rollout_Name: formData.rolloutName || '',
        // Legal_Entity_Code: formData.legalEntityCode || '',
        // Legal_Entity_Name: getLegalEntityDisplay(formData.legalEntityCode) || '',
        Business_Owner_Name: formData.businessOwnerName || '',
        Business_Owner_Email: formData.businessOwnerEmail || '',
        Functional_Owner_Name: resourceRosterOptions?.find(opt => opt.value === formData.functionalOwnerName)?.label || '',
        Functional_Owner_Email: formData.functionalOwnerEmail || '',
        Technical_Owner_Name: resourceRosterOptions?.find(opt => opt.value === formData.technicalOwnerName)?.label || '',
        Technical_Owner_Email: formData.technicalOwnerEmail || '',
        RICEW_Note: formData.notes || '',
        // ** RESOURCE ROSTER ROLES WITH EMAILS **
        // Extract names from emails (values) for backend
        Functional_Spec_Writer: resourceRosterOptions?.find(opt => opt.value === formData.functionalSpecWriter)?.label || '',
        Functional_Spec_Writer_Email: formData.functionalSpecWriterEmail || '',
        Technical_Spec_Writer: resourceRosterOptions?.find(opt => opt.value === formData.technicalSpecWriter)?.label || '',
        Technical_Spec_Writer_Email: formData.technicalSpecWriterEmail || '',
        Code_Deve_Unit_Testing: resourceRosterOptions?.find(opt => opt.value === formData.codeDeveloperUnitTesting)?.label || '',
        Code_Deve_Unit_Testing_Email: formData.codeDeveloperUnitTestingEmail || '',
        Functional_Unit_Tester: resourceRosterOptions?.find(opt => opt.value === formData.functionalUnitTester)?.label || '',
        Functional_Unit_Tester_Email: formData.functionalUnitTesterEmail || '',
        // ** APPROVAL FIELDS **
        // ** APPROVAL FIELDS **
        Functional_Specification_Approval: formData.functionalSpecApproval || '',
        Technical_Specification_Approval: formData.technicalSpecApproval || '',
        Functional_Testing_Approval: formData.functionalTestingApproval || ''
      };

      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      // Sanitize critical fields in requestData before sending
      const sanitizeRequestData = (data) => ({
        ...data,
        RICEWRequestFormId: data.RICEWRequestFormId ? DOMPurify.sanitize(String(data.RICEWRequestFormId).trim(), { ALLOWED_TAGS: [] }) : data.RICEWRequestFormId,
        RICEW_Name: DOMPurify.sanitize(String(data.RICEW_Name || '').trim(), { ALLOWED_TAGS: [] }),
        Project_id: DOMPurify.sanitize(String(data.Project_id || '').trim(), { ALLOWED_TAGS: [] }),
        user_id: DOMPurify.sanitize(String(data.user_id || '').trim(), { ALLOWED_TAGS: [] })
      });

      const response = await fetch(currentRecordId
        ? 'https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/update/ricew-request-form'
        : 'https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/post/ricew-request-form', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(sanitizeRequestData(requestData))
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        let errorMsg = 'Failed to save draft';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) { }
        throw new Error(errorMsg);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.displayId) {
        setFormData(prev => ({
          ...prev,
          ricewId: result.data.displayId
        }));
      }

      setSuccessMessage(currentRecordId ? 'Draft updated successfully!' : 'Draft saved successfully!');
      setShowSuccessMessage(true);

      // Set refresh flag for dashboard
      sessionStorage.setItem('ricew_refresh_needed', 'true');

      // If this was a new record creation, set the currentRecordId for future updates
      if (!currentRecordId && result.success && result.data && result.data.RICEWRequestFormId) {
        setCurrentRecordId(result.data.RICEWRequestFormId);
      }

      setTimeout(async () => {
        setShowSuccessMessage(false);
        // Only clear form data and navigate for new record creation, not updates
        if (!currentRecordId) {
          // Clear form data
          setFormData({ ...defaultFormData });
          setFieldErrors({});
          // Navigate back to dashboard
          if (onBackToList) {
            onBackToList();
          } else {
            navigate('/dashboard/ricew-dashboard');
          }
        } else {
          // For existing records, reload the data from API to get the latest changes
          await reloadRecordData();
        }
      }, 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
      setErrorMessage(error.message || 'Error saving draft. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    setFormData({ ...defaultFormData });
    setFieldErrors({});
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
        {/* Draft Indicator */}
        {isDraft && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '1rem',
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
              This is a saved draft record. Complete the form and click "Submit" to finalize it.
            </div>
          </div>
        )}

        {/* Form Title */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          marginBottom: '1rem',
          overflow: 'visible',
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
            //gap:"610px"
            justifyContent: 'space-between'
          }}>
            <span>{currentRecordId ? 'RICEW Request Form' : 'RICEW Request Form'}</span>
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

        <form onSubmit={handleSubmit}>
          {/* General Information Section */}
          <GeneralInformationSection
            formData={formData}
            fieldErrors={fieldErrors}
            onInputChange={handleInputChange}
            lovOptions={lovOptions}
          />

          {/* Process Stream Information and Status & Effort Information - Side by Side */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Process Stream Information Section */}
            <div style={{ flex: 1 }}>
              <ProcessStreamInformationSection
                formData={formData}
                fieldErrors={fieldErrors}
                onInputChange={handleInputChange}
                lovOptions={crossStreamLovOptions}
              />
            </div>

            {/* Status & Effort Information Section */}
            <div style={{ flex: 1 }}>
              <StatusEffortInformationSection
                formData={formData}
                fieldErrors={fieldErrors}
                onInputChange={handleInputChange}
                lovOptions={lovOptions}
                isEditMode={!!currentRecordId}
                onCalculate={handleCalculate}
              />
            </div>
          </div>

          {/* Implementation Phase Information Section and Ownership Section - Side by Side */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Implementation Phase Information Section */}
            <div style={{ flex: 1 }}>
              <ImplementationPhaseSection
                formData={formData}
                fieldErrors={fieldErrors}
                onInputChange={handleInputChange}
                lovOptions={lovOptions}
              />
            </div>

            {/* Ownership Section */}
            <div style={{ flex: 1 }}>
              <OwnershipSection
                formData={formData}
                fieldErrors={fieldErrors}
                onInputChange={handleInputChange}
                onFieldBlur={handleFieldBlur}
                resourceRosterOptions={resourceRosterOptions || []}
              />
            </div>
          </div>

          {/* Note Section and RICEW Resource Responsibility - Side by Side */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
            <div style={{ flex: 1 }}>
              <NoteSection
                formData={formData}
                fieldErrors={fieldErrors}
                onInputChange={handleInputChange}
              />
            </div>
            {/*
            <div style={{ flex: 1 }}>
              <RicewResourceResponsibilitySection
                formData={formData}
                fieldErrors={fieldErrors}
                onInputChange={handleInputChange}
                resourceRosterOptions={resourceRosterOptions || []}
              />
            </div>
            */}
          </div>

          {/* Form Actions */}
          <div style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
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
                currentRecordId ? 'Updating...' : 'Submitting...'
              ) : (
                currentRecordId ? 'Update' : 'Submit'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Message Popup */}
      {showSuccessMessage && (
        <SuccessMessage message={successMessage} />
      )}

      {/* Validation Error Message Popup */}
      {showValidationError && (
        <SuccessMessage message={validationErrorMessage} error={true} />
      )}

      {/* Error Message Popup */}
      {showErrorMessage && (
        <ErrorMessage message={errorMessage} />
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
                    The <strong>RICEW Request Form</strong> captures all details about a single technical development request — covering Reports, Integrations, Conversions, Extensions/Enhancements, Analytics, Alerts, Workflows, and Personalizations. It is the source of record for scope, effort, cost, ownership, and delivery status for each RICEW object.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    Custom technical objects are a significant part of any ERP implementation. This form provides a structured way to define, track, and approve each RICEW request — capturing the business need, complexity, effort estimate, cost, and responsible parties so nothing falls through the cracks.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Form sections</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>General Information</strong> — RICEW ID, type, name, description, and business justification. Required fields: Type, Name.</li>
                    <li><strong>Process Stream Information</strong> — The ERP process stream, application, L0 process, and module this RICEW belongs to, including cross-stream impact if applicable.</li>
                    <li><strong>Status &amp; Effort Information</strong> — Current status, complexity, estimated effort hours, and cost (currency and amount, auto-calculated from the rate card where available).</li>
                    <li><strong>Implementation Phase</strong> — The project phase in which this RICEW is planned for delivery.</li>
                    <li><strong>Ownership (Project Track) Information</strong> — Business Owner, Functional Owner, and Technical Owner responsible for this RICEW object.</li>
                    <li><strong>Notes</strong> — Free-text notes or additional context about the request.</li>
                    <li><strong>Resource Responsibility</strong> — Maps specific resources from the resource roster to this RICEW request.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Fill in the required fields (RICEW Type and Name) and any available optional fields, then click <strong>Submit</strong> to save the record.</li>
                    <li>Click <strong>Save Draft</strong> to save an incomplete record that you can return to later.</li>
                    <li>Click <strong>Update</strong> (when editing an existing record) to save changes.</li>
                    <li>Click <strong>Clear</strong> to reset the form to its default empty state.</li>
                    <li>If a rate card is configured, entering effort hours will auto-calculate the cost estimate.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>RICEW Type</strong> and <strong>RICEW Name</strong> are required to submit the form.</li>
                    <li>Draft records are shown with a yellow banner — complete and submit them to finalise.</li>
                    <li>Cost is auto-calculated when a rate card is linked; manual cost entry is also supported.</li>
                    <li>A project must be selected before this form can be used.</li>
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
  );
};

export default RicewRequestFormDetails;
