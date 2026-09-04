import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TextField, MenuItem } from '@mui/material';
import DOMPurify from 'dompurify';
import { HelpCircle } from 'lucide-react';
import {
  OrganizationAutocomplete,
  FullNameAutocomplete,
  PhoneCodeAutocomplete,
  EmploymentTypeAutocomplete,
  WorkLocationAutocomplete,
  NationalityAutocomplete,
  BusinessLineAutocomplete,
  PortfolioAutocomplete,
  ServiceLineAutocomplete,
  PrimarySkillAutocomplete,
  SecondarySkillAutocomplete,
  EmploymentStatusAutocomplete,
  ResourceLevelAutocomplete
} from '../Resource Roster Form/AutocompleteComponents';
import { CustomDatePicker } from '../Resource Roster Form/Components';
import { labelStyle, sectionHeaderStyle } from '../Resource Roster Form/Utils';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';

const ResourceDefinationForm = ({ onClose, selectedProject, onBackToLanding }) => {
  const { id } = useParams();
  const { userId, projectId } = useSession();
  const [formData, setFormData] = useState({
    organizationName: '',
    businessLine: '',
    portfolioName: '',
    serviceLineName: '',
    reportingManager: '',
    reportingManagerEmail: '',
    employeeLevel: '',
    joiningDate: '',
    exitDate: '',
    employmentStatus: '',
    fullName: '',
    employeeId: '',
    emailAddress: '',
    code: '',
    phoneNumber: '',
    employmentType: '',
    workLocation: '',
    nationality: '',
    primarySkill: '',
    secondarySkill: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [dateValidationErrors, setDateValidationErrors] = useState({});
  const [isDraftRecord, setIsDraftRecord] = useState(false);

  // State for LOV data
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [orgServiceData, setOrgServiceData] = useState([]);
  const [orgBusinessLineData, setOrgBusinessLineData] = useState([]);
  const [orgPortfolioData, setOrgPortfolioData] = useState([]);
  const [phoneCodeOptions, setPhoneCodeOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [skillCategoriesData, setSkillCategoriesData] = useState([]);
  const [levelDefinitions, setLevelDefinitions] = useState([]);

  const loadResourceData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const idToken = await getIdToken();
      const response = await fetch(`https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/allData/resource-definition/${id}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          setIsDraftRecord(data.save_draft === 'true' || data.save_draft === true);
          
          // Map designations/level code
          let matchedLevelCode = data.Employee_Level || '';
          if (levelDefinitions && levelDefinitions.length > 0) {
            const matched = levelDefinitions.find(
              ld => ld.designation === data.Employee_Level || ld.Level_Code === data.Employee_Level || ld.Level_Short_Code === data.Employee_Level
            );
            if (matched) matchedLevelCode = matched.Level_Short_Code;
          }

          setFormData({
            organizationName: data.Organization_Name || '',
            businessLine: data.Business_Line || '',
            portfolioName: data.Portfolio_Name || '',
            serviceLineName: data.Service_Line_Name || '',
            reportingManager: data.Reporting_Manager_name || '',
            reportingManagerEmail: data.Manager_email || '',
            employeeLevel: matchedLevelCode,
            joiningDate: data.Joining_Date || '',
            exitDate: data.Exit_Date || '',
            employmentStatus: data.Employment_Status || '',
            fullName: data.Full_Name || '',
            employeeId: data.Employee_ID || '',
            emailAddress: data.Email_Address || '',
            code: data.Code_Phone || '',
            phoneNumber: data.Phone_Number || '',
            employmentType: data.Employment_Type || '',
            workLocation: data.Work_Location || '',
            nationality: data.Nationality || '',
            primarySkill: data.Primary_Skill?.skill_name || data.Primary_Skill || '',
            secondarySkill: data.Secondary_Skill?.skill_name || data.Secondary_Skill || ''
          });
        }
      } else {
        console.error('Failed to load resource record details');
      }
    } catch (error) {
      console.error('Error loading resource data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load existing resource definition data if in edit mode
  useEffect(() => {
    if (levelDefinitions.length > 0) {
      loadResourceData();
    }
  }, [id, levelDefinitions]);

  // Resolve organization name to ID if needed (handles both old and new formats)
  useEffect(() => {
    if (organizationOptions.length > 0 && formData.organizationName) {
      let orgId = null;

      // Check if it's already an ID (starts with "ORG")
      if (formData.organizationName.startsWith('ORG')) {
        orgId = formData.organizationName;
      } else if (formData.organizationName.includes('(') && formData.organizationName.includes(')')) {
        // Extract ID from "org name (org id)" format
        const match = formData.organizationName.match(/\(([^)]+)\)$/);
        if (match) {
          orgId = match[1];
        }
      } else {
        // Legacy: just organization name, find by SI_organization_name
        const matched = organizationOptions.find(
          opt => opt.SI_organization_name === formData.organizationName
        );
        if (matched) {
          orgId = matched.organization_id;
        }
      }

      if (orgId && orgId !== formData.organizationName) {
        setFormData(prev => ({
          ...prev,
          organizationName: orgId
        }));
      }
    }
  }, [organizationOptions, formData.organizationName]);

  // Fetch LOV data on component mount
  useEffect(() => {
    const loadAllData = async () => {

      const fetchHierarchicalLOVData = async () => {
        try {
          const idToken = await getIdToken();
          const response = await fetch(
            'https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/LOV/resource-definition-dropdownList',
            {
              headers: { 'Authorization': `Bearer ${idToken}` }
            }
          );
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.organizations) {
              // Sort raw organizations by organization_id first
              const sortedOrgs = [...result.organizations].sort((a, b) => 
                (a.organization_id || '').localeCompare(b.organization_id || '', undefined, { numeric: true })
              );

              // 1. Set organizationOptions (uniquely identified and sorted)
              setOrganizationOptions(sortedOrgs.map(org => ({
                value: org.organization_id,
                label: `${org.SI_organization_name} (${org.organization_id})`,
                ...org
              })));

              // 2. Map & Set orgBusinessLineData (sorted by Business_Line_DisplayID)
              const businessLineDataMapped = sortedOrgs.map(org => {
                const businessLines = (org.businessLines || []).map(bl => ({
                  name: bl.Business_Line_Name,
                  display_id: bl.Business_Line_DisplayID
                }))
                .filter(bl => bl.name)
                .sort((a, b) => (a.display_id || '').localeCompare(b.display_id || '', undefined, { numeric: true }));

                return {
                  organization_id: org.organization_id,
                  SI_organization_name: org.SI_organization_name,
                  business_lines: businessLines
                };
              });
              setOrgBusinessLineData(businessLineDataMapped);

              // 3. Map & Set orgPortfolioData (sorted by Portfolio_DisplayID)
              const portfolioDataMapped = sortedOrgs.map(org => {
                const portfolios = [];
                (org.businessLines || []).forEach(bl => {
                  const blDisplayId = bl.Business_Line_DisplayID;
                  const linkedPortfolios = bl.businessLines || [];
                  linkedPortfolios.forEach(p => {
                    portfolios.push({
                      name: p.Portfolio_Name,
                      display_id: p.Portfolio_DisplayID,
                      business_line_id: blDisplayId
                    });
                  });
                });

                return {
                  organization_id: org.organization_id,
                  SI_organization_name: org.SI_organization_name,
                  portfolios: portfolios.filter(p => p.name).sort((a, b) => 
                    (a.display_id || '').localeCompare(b.display_id || '', undefined, { numeric: true })
                  )
                };
              });
              setOrgPortfolioData(portfolioDataMapped);

              // 4. Map & Set orgServiceData (sorted by Service_DisplayID)
              const serviceDataMapped = sortedOrgs.map(org => {
                const services = [];
                (org.businessLines || []).forEach(bl => {
                  const linkedPortfolios = bl.businessLines || [];
                  linkedPortfolios.forEach(p => {
                    const portfolioDisplayId = p.Portfolio_DisplayID;
                    const linkedServices = p.services || [];
                    linkedServices.forEach(s => {
                      services.push({
                        Service_Name: s.Service_Name,
                        Service_DisplayID: s.Service_DisplayID,
                        Portfolio_DisplayID: portfolioDisplayId
                      });
                    });
                  });
                });

                return {
                  organization_id: org.organization_id,
                  SI_organization_name: org.SI_organization_name,
                  services: services.filter(s => s.Service_Name).sort((a, b) => 
                    (a.Service_DisplayID || '').localeCompare(b.Service_DisplayID || '', undefined, { numeric: true })
                  )
                };
              });
              setOrgServiceData(serviceDataMapped);

              // 5. Map & Set countryOptions for Work Location and Nationality
              const countries = new Set();
              const phoneCodes = new Set();
              sortedOrgs.forEach(org => {
                if (org.country_of_operations) {
                  org.country_of_operations.split(',').forEach(c => {
                    const trimmed = c.trim();
                    if (trimmed) {
                      countries.add(trimmed);
                    }
                  });
                }
                if (org.PhoneCode) {
                  const trimmedCode = org.PhoneCode.trim();
                  if (trimmedCode) {
                    phoneCodes.add(trimmedCode);
                  }
                }
              });
              const sortedCountries = Array.from(countries).sort();
              setCountryOptions(sortedCountries.map(country => ({
                value: country,
                label: country
              })));

              const sortedPhoneCodes = Array.from(phoneCodes).sort((a, b) => 
                a.localeCompare(b, undefined, { numeric: true })
              );
              setPhoneCodeOptions(sortedPhoneCodes.map(code => ({
                value: code,
                label: code
              })));
            }
          }
        } catch (error) {
          console.error('Error fetching hierarchical LOV data:', error);
        }
      };

      const fetchSkillCategories = async () => {
        try {
          const idToken = await getIdToken();
          const response = await fetch('https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/ricew/get/categorySubcategoryRiskIssueForm', {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const sorted = [...result.data].sort((a, b) => {
                const idA = parseInt(a.Category_Subcategory_id || 0, 10);
                const idB = parseInt(b.Category_Subcategory_id || 0, 10);
                return idA - idB;
              });
              setSkillCategoriesData(sorted);
            }
          }
        } catch (error) {
          console.error('Error fetching skill categories:', error);
        }
      };

      const fetchLevelDefinitions = async () => {
        try {
          const idToken = await getIdToken();
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
        }
      };

      // Execute all API calls in parallel for better performance
      await Promise.all([
        fetchHierarchicalLOVData(),
        fetchSkillCategories(),
        fetchLevelDefinitions()
      ]);
    };

    loadAllData();
  }, [selectedProject?.id]);

  // Derive primary skill options (unique categories in order of Category_Subcategory_id)
  const primarySkillOptions = useMemo(() => {
    const categories = [];
    skillCategoriesData.forEach(item => {
      const cat = item.Category_Name || item.Category || item.category_name || item.category || item.Category_Code || '';
      if (cat && !categories.includes(cat)) {
        categories.push(cat);
      }
    });
    return categories.map(cat => ({
      value: cat,
      label: cat
    }));
  }, [skillCategoriesData]);

  // Derive secondary skill options (same unique categories in order of Category_Subcategory_id)
  const secondarySkillOptions = useMemo(() => {
    const categories = [];
    skillCategoriesData.forEach(item => {
      const cat = item.Category_Name || item.Category || item.category_name || item.category || item.Category_Code || '';
      if (cat && !categories.includes(cat)) {
        categories.push(cat);
      }
    });
    return categories.map(cat => ({
      value: cat,
      label: cat
    }));
  }, [skillCategoriesData]);

  // Derive service line options based on selected organization and portfolio
  const serviceLineOptions = useMemo(() => {
    if (!formData.organizationName || !orgServiceData.length) return [];
    const selectedOrg = orgServiceData.find(org => org.organization_id === formData.organizationName || org.SI_organization_name === formData.organizationName);
    if (selectedOrg && selectedOrg.services) {
      // Find the portfolio display ID for filtering
      const selectedPortfolio = orgPortfolioData.find(org => org.organization_id === formData.organizationName || org.SI_organization_name === formData.organizationName)
        ?.portfolios?.find(p => p.name === formData.portfolioName);
      const portfolioDisplayId = selectedPortfolio?.display_id;

      let filteredServices = selectedOrg.services;
      if (portfolioDisplayId) {
        filteredServices = filteredServices.filter(s => s.Portfolio_DisplayID === portfolioDisplayId);
      }

      return filteredServices.map(sl => ({
        value: sl.Service_Name,
        label: sl.Service_Name
      }));
    }
    return [];
  }, [formData.organizationName, formData.portfolioName, orgServiceData, orgPortfolioData]);

  // Derive business line options based on selected organization
  const businessLineOptions = useMemo(() => {
    if (!formData.organizationName || !orgBusinessLineData.length) return [];
    const selectedOrg = orgBusinessLineData.find(org => org.organization_id === formData.organizationName || org.SI_organization_name === formData.organizationName);
    if (selectedOrg && selectedOrg.business_lines) {
      return selectedOrg.business_lines.map(bl => ({
        value: bl.name,
        label: bl.name
      }));
    }
    return [];
  }, [formData.organizationName, orgBusinessLineData]);

  // Derive portfolio options based on selected organization
  const portfolioOptions = useMemo(() => {
    if (!formData.organizationName || !orgPortfolioData.length) return [];
    const selectedOrg = orgPortfolioData.find(org => org.organization_id === formData.organizationName || org.SI_organization_name === formData.organizationName);
    if (selectedOrg && selectedOrg.portfolios) {
      const selectedBL = orgBusinessLineData.find(org => org.organization_id === formData.organizationName || org.SI_organization_name === formData.organizationName)
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Handle dependent field resets
    if (name === 'organizationName') {
      setFormData(prev => ({
        ...prev,
        organizationName: value,
        serviceLineName: '',
        businessLine: '',
        portfolioName: ''
      }));
    } else if (name === 'businessLine') {
      setFormData(prev => ({
        ...prev,
        businessLine: value,
        serviceLineName: '',
        portfolioName: ''
      }));
    } else if (name === 'portfolioName') {
      setFormData(prev => ({
        ...prev,
        portfolioName: value,
        serviceLineName: ''  // Reset service line when portfolio changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateEmailField = (email, fieldName = 'emailAddress') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: 'Invalid email address format'
      }));
    }
  };

  const validatePhoneField = (phone) => {
    if (phone && phone.length < 10) {
      setFieldErrors(prev => ({
        ...prev,
        phoneNumber: 'Phone number must be 10 digits'
      }));
    }
  };

  const handleDateChange = (date, fieldName) => {
    handleChange({ target: { name: fieldName, value: date } });
    clearDateValidationError(fieldName);

    // Validate date relationships
    const updatedFormData = { ...formData, [fieldName]: date };
    validateDateRelationships(updatedFormData);
  };

  const validateDateRelationships = (data) => {
    setFieldErrors(prev => {
      const updatedErrors = { ...prev };

      // Check if Joining Date is greater than Exit Date
      if (data.joiningDate && data.exitDate) {
        const joiningDate = new Date(data.joiningDate);
        const exitDate = new Date(data.exitDate);

        if (joiningDate > exitDate) {
          updatedErrors.joiningDate = 'Joining Date cannot be greater than Exit Date';
          updatedErrors.exitDate = 'Exit Date cannot be before Joining Date';
        } else {
          // Dates are valid, clear the date relationship errors
          if (updatedErrors.joiningDate === 'Joining Date cannot be greater than Exit Date') {
            delete updatedErrors.joiningDate;
          }
          if (updatedErrors.exitDate === 'Exit Date cannot be before Joining Date') {
            delete updatedErrors.exitDate;
          }
        }
      } else if (!data.exitDate || !data.joiningDate) {
        // Clear errors if either date is empty
        if (updatedErrors.joiningDate === 'Joining Date cannot be greater than Exit Date') {
          delete updatedErrors.joiningDate;
        }
        if (updatedErrors.exitDate === 'Exit Date cannot be before Joining Date') {
          delete updatedErrors.exitDate;
        }
      }

      return updatedErrors;
    });
  };

  const handleInputError = (fieldName, error) => {
    if (error) {
      setDateValidationErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  };

  const clearDateValidationError = (fieldName) => {
    setDateValidationErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  };

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const saveRecord = async (isDraft) => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const idToken = await getIdToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const selectedLevelDef = levelDefinitions.find(
        def => def.Level_Short_Code === formData.employeeLevel
      );
      const employeeLevelVal = selectedLevelDef ? (selectedLevelDef.designation || selectedLevelDef.Level_Short_Code) : formData.employeeLevel;

      // Find the corresponding SI_organization_name using the organization_id stored in formData
      const selectedOrg = organizationOptions.find(
        org => org.organization_id === formData.organizationName
      );
      const organizationNameVal = selectedOrg ? `${selectedOrg.SI_organization_name} (${selectedOrg.organization_id})` : formData.organizationName;

      const payload = {
        ...(id && { Resource_Defination_Form_record_id: id }),
        Organization_Name: organizationNameVal || '',
        Business_Line: formData.businessLine || '',
        Portfolio_Name: formData.portfolioName || '',
        Service_Line_Name: formData.serviceLineName || '',
        Reporting_Manager_name: formData.reportingManager || '',
        Manager_email: formData.reportingManagerEmail || '',
        Employee_Level: employeeLevelVal || '',
        Employment_Type: formData.employmentType || '',
        Joining_Date: formData.joiningDate || '',
        Exit_Date: formData.exitDate || '',
        Employment_Status: formData.employmentStatus || '',
        Full_Name: formData.fullName || '',
        Employee_ID: formData.employeeId || '',
        Email_Address: formData.emailAddress || '',
        Code_Phone: formData.code || '',
        Phone_Number: formData.phoneNumber || '',
        Work_Location: formData.workLocation || '',
        Nationality: formData.nationality || '',
        Primary_Skill: {
          skill_name: formData.primarySkill || ''
        },
        Secondary_Skill: {
          skill_name: formData.secondarySkill || ''
        },
        save_draft: isDraft ? 'true' : 'false',
        ...(id ? { updated_by: userId } : { created_by: userId })
      };

      const apiUrl = id
        ? 'https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/ricew/update/resourceDefinitionForm'
        : 'https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/ricew/create/resourceDefinitionForm';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        setIsDraftRecord(isDraft);
        setSuccessMessage(
          isDraft
            ? (id ? 'Resource definition draft updated successfully!' : 'Resource definition draft saved successfully!')
            : (id ? 'Resource definition updated successfully!' : 'Resource definition submitted successfully!')
        );
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        if (id) {
          loadResourceData();
        } else {
          handleClear();
          if (onBackToLanding) {
            setTimeout(() => onBackToLanding(), 1500);
          }
        }
      } else {
        throw new Error(result.error || 'API execution failed');
      }
    } catch (error) {
      console.error('Error saving resource definition record:', error);
      setErrorMessage(error.message || 'Error saving record. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    // Validate required fields for draft: Full_Name, Email_Address, Employee_ID
    const draftErrors = {};
    if (!formData.fullName) draftErrors.fullName = 'Full Name is required';
    if (!formData.emailAddress) draftErrors.emailAddress = 'Email Address is required';
    if (!formData.employeeId) draftErrors.employeeId = 'Employee ID is required';

    // Validate email formats if present
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.emailAddress && !emailRegex.test(formData.emailAddress)) {
      draftErrors.emailAddress = 'Invalid email address format';
    }
    if (formData.reportingManagerEmail && !emailRegex.test(formData.reportingManagerEmail)) {
      draftErrors.reportingManagerEmail = 'Invalid email address format';
    }

    if (Object.keys(draftErrors).length > 0) {
      setFieldErrors(draftErrors);

      const hasMissingRequired = !formData.fullName || !formData.emailAddress || !formData.employeeId;
      if (hasMissingRequired) {
        setErrorMessage('Please fill in required draft fields: Full Name, Email Address, Employee ID');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
      }
      return;
    }

    saveRecord(true);
  };

  const handleClear = () => {
    // Reset form to initial state
    setFormData({
      organizationName: '',
      businessLine: '',
      portfolioName: '',
      serviceLineName: '',
      reportingManager: '',
      reportingManagerEmail: '',
      employeeLevel: '',
      joiningDate: '',
      exitDate: '',
      employmentStatus: '',
      fullName: '',
      employeeId: '',
      emailAddress: '',
      code: '',
      phoneNumber: '',
      employmentType: '',
      workLocation: '',
      nationality: '',
      primarySkill: '',
      secondarySkill: ''
    });
    setFieldErrors({});
    setDateValidationErrors({});
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Validate all required fields
    const requiredFields = [
      'organizationName',
      'businessLine',
      'portfolioName',
      'serviceLineName',
      'fullName',
      'emailAddress',
      'joiningDate',
      'exitDate',
      'employeeId',
      'primarySkill',
      'phoneNumber',
      'code'
    ];
    const errors = {};

    requiredFields.forEach(field => {
      if (!formData[field]) {
        const fieldNameMap = {
          organizationName: 'Organization Name',
          businessLine: 'Business Line',
          portfolioName: 'Portfolio Name',
          serviceLineName: 'Service Line Name',
          fullName: 'Full Name',
          emailAddress: 'Email Address',
          joiningDate: 'Joining Date',
          exitDate: 'Exit Date',
          employeeId: 'Employee ID',
          primarySkill: 'Primary Skill',
          phoneNumber: 'Phone Number',
          code: 'Code'
        };
        errors[field] = `${fieldNameMap[field] || field} is required`;
      }
    });

    // Validate email formats if present
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.emailAddress && !emailRegex.test(formData.emailAddress)) {
      errors.emailAddress = 'Invalid email address format';
    }
    if (formData.reportingManagerEmail && !emailRegex.test(formData.reportingManagerEmail)) {
      errors.reportingManagerEmail = 'Invalid email address format';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);

      const hasMissingRequired = requiredFields.some(field => !formData[field]);
      if (hasMissingRequired) {
        setErrorMessage('Please fill in all required fields');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
      }
      return;
    }

    saveRecord(false);
  };

  return (
    <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
      <div style={{ padding: '1rem 1rem 2rem 1rem', maxWidth: '100%', margin: '0' }}>
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
            <span>Resource Defination Form</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
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
                  gap: '6px'
                }}
              >
                <HelpCircle size={15} />
                Help
              </button>
            </div>
          </div>
        </div>

        {/* Draft Record Banner */}
        {isDraftRecord && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeeba',
            color: '#856404',
            padding: '12px 16px',
            marginBottom: '1rem',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            This record is currently saved as a draft. Please fill in all required fields and submit to finalize.
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          marginBottom: '1rem',
          overflow: 'visible'
        }}>
          <div style={sectionHeaderStyle}>
            Organization & Employment Information
          </div>
          <div style={{ padding: '12px 16px', overflow: 'visible' }}>
            {/* Row 1 */}
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'nowrap', gap: '4px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '130px', marginRight: '2px' }}>Organization Name <span style={{ color: 'red' }}>*</span></label>
                  <OrganizationAutocomplete
                    key="organization-autocomplete"
                    value={formData.organizationName}
                    onChange={(value) => {
                      handleChange({ target: { name: 'organizationName', value } });
                    }}
                    options={organizationOptions}
                    error={!!fieldErrors?.organizationName}
                  />
                </div>
                {fieldErrors?.organizationName && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '135px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.organizationName, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '105px', marginRight: '2px', marginLeft: '13px' }}>Business Line <span style={{ color: 'red' }}>*</span></label>
                  <BusinessLineAutocomplete
                    key="business-line-autocomplete"
                    value={formData.businessLine}
                    onChange={(value) => {
                      handleChange({ target: { name: 'businessLine', value } });
                    }}
                    options={businessLineOptions}
                    error={!!fieldErrors?.businessLine}
                  />
                </div>
                {fieldErrors?.businessLine && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '122px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.businessLine, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '100px', marginRight: '2px', marginLeft: '10px' }}>Portfolio Name <span style={{ color: 'red' }}>*</span></label>
                  <PortfolioAutocomplete
                    key="portfolio-autocomplete"
                    value={formData.portfolioName}
                    onChange={(value) => {
                      handleChange({ target: { name: 'portfolioName', value } });
                    }}
                    options={portfolioOptions}
                    error={!!fieldErrors?.portfolioName}
                  />
                </div>
                {fieldErrors?.portfolioName && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '115px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.portfolioName, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '130px', marginRight: '2px', marginLeft: '10px' }}>Service Line Name <span style={{ color: 'red' }}>*</span></label>
                  <ServiceLineAutocomplete
                    key="service-line-autocomplete"
                    value={formData.serviceLineName}
                    onChange={(value) => {
                      handleChange({ target: { name: 'serviceLineName', value } });
                    }}
                    options={serviceLineOptions}
                    error={!!fieldErrors?.serviceLineName}
                  />
                </div>
                {fieldErrors?.serviceLineName && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '145px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.serviceLineName, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '128px', marginTop: '6px' }}>Reporting Manager</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    {/* Name Column */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        name="reportingManager"
                        value={formData.reportingManager}
                        onChange={handleChange}
                        placeholder="Name"
                        size="small"
                        error={!!fieldErrors?.reportingManager}
                        sx={{
                          width: '180px',
                          '& .MuiInputBase-root': {
                            backgroundColor: 'white',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                          },
                          '& .MuiInputBase-input': {
                            padding: '6px 10px',
                            fontSize: '13px',
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#ddd',
                              borderRadius: '3px',
                            },
                            '&:hover fieldset': {
                              borderColor: '#ddd',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#ddd',
                              borderWidth: '1px',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            display: 'none',
                          },
                        }}
                      />
                      {fieldErrors?.reportingManager && (
                        <div style={{
                          marginTop: '4px',
                          color: '#dc2626',
                          fontSize: '10.5px',
                          fontWeight: '500'
                        }}>
                          {DOMPurify.sanitize(fieldErrors.reportingManager, { ALLOWED_TAGS: [] })}
                        </div>
                      )}
                    </div>

                    {/* Email Column */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        name="reportingManagerEmail"
                        value={formData.reportingManagerEmail}
                        onChange={handleChange}
                        onBlur={(e) => validateEmailField(e.target.value, 'reportingManagerEmail')}
                        placeholder="Email"
                        size="small"
                        error={!!fieldErrors?.reportingManagerEmail}
                        sx={{
                          width: '180px',
                          '& .MuiInputBase-root': {
                            backgroundColor: 'white',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                          },
                          '& .MuiInputBase-input': {
                            padding: '6px 10px',
                            fontSize: '13px',
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#ddd',
                              borderRadius: '3px',
                            },
                            '&:hover fieldset': {
                              borderColor: '#ddd',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#ddd',
                              borderWidth: '1px',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            display: 'none',
                          },
                        }}
                      />
                      {fieldErrors?.reportingManagerEmail && (
                        <div style={{
                          marginTop: '4px',
                          color: '#dc2626',
                          fontSize: '10.5px',
                          fontWeight: '500'
                        }}>
                          {DOMPurify.sanitize(fieldErrors.reportingManagerEmail, { ALLOWED_TAGS: [] })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '108px', marginLeft: '10px' }}>Employee Level</label>
                  <ResourceLevelAutocomplete
                    key="employee-level-autocomplete"
                    value={formData.employeeLevel}
                    onChange={(value) => {
                      handleChange({ target: { name: 'employeeLevel', value } });
                    }}
                    error={!!fieldErrors?.employeeLevel}
                  />
                </div>
                {fieldErrors?.employeeLevel && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '120px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.employeeLevel, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '130px', marginLeft: '10px' }}>Employment Type</label>
                  <EmploymentTypeAutocomplete
                    key="employment-type-autocomplete"
                    value={formData.employmentType}
                    onChange={(value) => {
                      handleChange({ target: { name: 'employmentType', value } });
                    }}
                    error={!!fieldErrors?.employmentType}
                  />
                </div>
                {fieldErrors?.employmentType && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '135px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.employmentType, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '120px', marginLeft: '0px', marginRight: '13px' }}>Joining Date <span style={{ color: 'red' }}>*</span></label>
                  <CustomDatePicker
                    value={formData.joiningDate}
                    onChange={(date) => handleDateChange(date, 'joiningDate')}
                    onError={(error) => handleInputError('joiningDate', error)}
                    clearDateValidationError={() => clearDateValidationError('joiningDate')}
                    onFocus={() => {
                      if (fieldErrors.joiningDate) {
                        clearFieldError('joiningDate');
                      }
                    }}
                    placeholder="DD-MMM-YYYY"
                    error={!!fieldErrors?.joiningDate || !!dateValidationErrors?.joiningDate}
                  />
                </div>
                {fieldErrors?.joiningDate && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '133px',
                    marginTop: '4px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    zIndex: 10
                  }}>
                    {DOMPurify.sanitize(fieldErrors.joiningDate, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '105px', marginLeft: '12px' }}>Exit Date <span style={{ color: 'red' }}>*</span></label>
                  <CustomDatePicker
                    value={formData.exitDate}
                    onChange={(date) => handleDateChange(date, 'exitDate')}
                    onError={(error) => handleInputError('exitDate', error)}
                    clearDateValidationError={() => clearDateValidationError('exitDate')}
                    onFocus={() => {
                      if (fieldErrors.exitDate) {
                        clearFieldError('exitDate');
                      }
                    }}
                    placeholder="DD-MMM-YYYY"
                    error={!!fieldErrors?.exitDate || !!dateValidationErrors?.exitDate}
                  />
                </div>
                {fieldErrors?.exitDate && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '120px',
                    marginTop: '4px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    zIndex: 10
                  }}>
                    {DOMPurify.sanitize(fieldErrors.exitDate, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '130px', marginLeft: '10px' }}>Employment Status</label>
                  <EmploymentStatusAutocomplete
                    key="employment-status-autocomplete"
                    value={formData.employmentStatus}
                    onChange={(value) => {
                      handleChange({ target: { name: 'employmentStatus', value } });
                    }}
                    error={!!fieldErrors?.employmentStatus}
                  />
                </div>
                {fieldErrors?.employmentStatus && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '135px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.employmentStatus, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          marginBottom: '1rem',
          overflow: 'visible'
        }}>
          <div style={sectionHeaderStyle}>
            Personal Information
          </div>
          <div style={{ padding: '12px 16px', overflow: 'visible' }}>
            {/* Row 1 */}
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'nowrap', gap: '4px' }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '70px', marginRight: '35px' }}>Full Name <span style={{ color: 'red' }}>*</span></label>
                  <TextField
                    name="fullName"
                    value={formData.fullName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 100) {
                        handleChange(e);
                      }
                    }}
                    maxLength={100}
                    size="small"
                    error={!!fieldErrors?.fullName}
                    sx={{
                      mr: '0px',
                      ml: '2px',
                      width: '180px',
                      '& .MuiInputBase-root': {
                        backgroundColor: 'white',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                      },
                      '& .MuiInputBase-input': {
                        padding: '6px 10px',
                        fontSize: '13px',
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: '#ddd',
                          borderRadius: '3px',
                        },
                        '&:hover fieldset': {
                          borderColor: '#ddd',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ddd',
                          borderWidth: '1px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      },
                    }}
                  />
                </div>
                {fieldErrors?.fullName && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '108px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.fullName, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '105px', marginRight: '-4px', marginLeft: '10px' }}>Employee ID <span style={{ color: 'red' }}>*</span></label>
                  <TextField
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    maxLength={50}
                    size="small"
                    error={!!fieldErrors?.employeeId}
                    sx={{
                      mr: '0px',
                      ml: '2px',
                      width: '180px',
                      '& .MuiInputBase-root': {
                        backgroundColor: 'white',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                      },
                      '& .MuiInputBase-input': {
                        padding: '6px 10px',
                        fontSize: '13px',
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: '#ddd',
                          borderRadius: '3px',
                        },
                        '&:hover fieldset': {
                          borderColor: '#ddd',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ddd',
                          borderWidth: '1px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      },
                    }}
                  />
                </div>
                {fieldErrors?.employeeId && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '115px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.employeeId, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '105px', marginLeft: '10px' }}>Email Address <span style={{ color: 'red' }}>*</span></label>
                  <TextField
                    name="emailAddress"
                    value={formData.emailAddress}
                    onChange={handleChange}
                    onBlur={(e) => validateEmailField(e.target.value)}
                    maxLength={100}
                    size="small"
                    error={!!fieldErrors?.emailAddress}
                    sx={{
                      mr: '10px',
                      width: '180px',
                      '& .MuiInputBase-root': {
                        backgroundColor: 'white',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                      },
                      '& .MuiInputBase-input': {
                        padding: '6px 10px',
                        fontSize: '13px',
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: '#ddd',
                          borderRadius: '3px',
                        },
                        '&:hover fieldset': {
                          borderColor: '#ddd',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ddd',
                          borderWidth: '1px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      },
                    }}
                  />
                </div>
                {fieldErrors?.emailAddress && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '118px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.emailAddress, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '50px' }}>Code <span style={{ color: 'red' }}>*</span></label>
                  <PhoneCodeAutocomplete
                    key="phone-code-autocomplete"
                    value={formData.code}
                    onChange={(value) => {
                      handleChange({ target: { name: 'code', value } });
                    }}
                    options={phoneCodeOptions}
                    error={!!fieldErrors?.code}
                  />
                </div>
                {fieldErrors?.code && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '55px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.code, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '100px', marginLeft: '10px' }}>Phone Number <span style={{ color: 'red' }}>*</span></label>
                  <TextField
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').substring(0, 10);
                      handleChange({ target: { name: 'phoneNumber', value } });
                    }}
                    onBlur={(e) => validatePhoneField(e.target.value)}
                    size="small"
                    error={!!fieldErrors?.phoneNumber}
                    sx={{
                      mr: '10px',
                      width: '180px',
                      '& .MuiInputBase-root': {
                        backgroundColor: 'white',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                      },
                      '& .MuiInputBase-input': {
                        padding: '6px 10px',
                        fontSize: '13px',
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: '#ddd',
                          borderRadius: '3px',
                        },
                        '&:hover fieldset': {
                          borderColor: '#ddd',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ddd',
                          borderWidth: '1px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      },
                    }}
                  />
                </div>
                {fieldErrors?.phoneNumber && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '115px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.phoneNumber, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '105px' }}>Work Location</label>
                  <WorkLocationAutocomplete
                    key="work-location-autocomplete"
                    value={formData.workLocation}
                    onChange={(value) => {
                      handleChange({ target: { name: 'workLocation', value } });
                    }}
                    options={countryOptions}
                    error={!!fieldErrors?.workLocation}
                  />
                </div>
                {fieldErrors?.workLocation && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '110px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.workLocation, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '100px', marginLeft: '10px' }}>Nationality</label>
                  <NationalityAutocomplete
                    key="nationality-autocomplete"
                    value={formData.nationality}
                    onChange={(value) => {
                      handleChange({ target: { name: 'nationality', value } });
                    }}
                    options={countryOptions}
                    error={!!fieldErrors?.nationality}
                  />
                </div>
                {fieldErrors?.nationality && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '115px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.nationality, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          marginBottom: '1rem',
          overflow: 'visible'
        }}>
          <div style={sectionHeaderStyle}>
            Skills & Competency Management
          </div>
          <div style={{ padding: '12px 16px', overflow: 'visible' }}>
            {/* Row 1 */}
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '130px' }}>Primary Skill <span style={{ color: 'red' }}>*</span></label>
                  <PrimarySkillAutocomplete
                    key="primary-skill-autocomplete"
                    value={formData.primarySkill}
                    onChange={(value) => {
                      handleChange({ target: { name: 'primarySkill', value } });
                    }}
                    options={primarySkillOptions}
                    error={!!fieldErrors?.primarySkill}
                  />
                </div>
                {fieldErrors?.primarySkill && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '135px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.primarySkill, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, width: '130px' }}>Secondary Skill</label>
                  <SecondarySkillAutocomplete
                    key="secondary-skill-autocomplete"
                    value={formData.secondarySkill}
                    onChange={(value) => {
                      handleChange({ target: { name: 'secondarySkill', value } });
                    }}
                    options={secondarySkillOptions}
                    error={!!fieldErrors?.secondarySkill}
                  />
                </div>
                {fieldErrors?.secondarySkill && (
                  <div style={{
                    marginTop: '4px',
                    marginLeft: '135px',
                    color: '#dc2626',
                    fontSize: '10.5px',
                    fontWeight: '500'
                  }}>
                    {DOMPurify.sanitize(fieldErrors.secondarySkill, { ALLOWED_TAGS: [] })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
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
            {DOMPurify.sanitize(successMessage, { ALLOWED_TAGS: [] })}
          </div>
        )}

        {/* Error Message */}
        {showErrorMessage && (
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
            {DOMPurify.sanitize(errorMessage, { ALLOWED_TAGS: [] })}
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
            onClick={handleClear}
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
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 24px',
              backgroundColor: loading ? '#9ca3af' : '#28a745',
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
            {loading ? (id ? 'Updating...' : 'Submitting...') : (id ? 'Update' : 'Submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceDefinationForm;
