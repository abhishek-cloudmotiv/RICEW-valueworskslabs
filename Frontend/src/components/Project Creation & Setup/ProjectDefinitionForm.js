import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import { Plus, Lock, Unlock, HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { labelStyle, sectionHeaderStyle, textFieldStyle } from '../Resource Roster Form/Utils';
import CustomDatePicker from './CustomDatePicker';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';
import {
    SubscriptionLicenseAutocomplete,
    ProjectTypeAutocomplete,
    DeploymentModelAutocomplete,
    ParentProjectIdAutocomplete,
    parentProjectData,
    CustomAutocomplete,
    PrimaryCountryAutocomplete
} from './ProjectAutocompleteComponents';

const ProjectDefinitionForm = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
    const { handleAuthError, userId, projectId, orderId, setProjectId, setProjectName, setOrderId } = useSession();
    const { getCachedToken } = useAuth();

    // Form State
    const [formData, setFormData] = useState({
        subscriptionLicense: orderId || '',
        projectRecordId: '',
        projectId: projectId || 'System Generated',
        projectSequence: '1 of Total Projects Allowed',
        startDate: '01-JAN-2026',
        endDate: '01-JAN-2027',
        legalCompanyName: 'Deloitte Consulting LLP',

        // Project Header Information
        projectName: '',
        projectDescription: '',
        projectType: '',
        deploymentModel: '',
        primaryCountry: '',
        industryName: '',
        sectorName: '',
        subsectorName: '',
        parentProjectId: '',
        parentProjectName: '',
        parentProjectDescription: '',

        // SI Project Leadership
        siLeadPartnerName: '', siLeadPartnerEmail: '',
        siProgramManagerName: '', siProgramManagerEmail: '',
        siProjectManagerName: '', siProjectManagerEmail: '',
        siQaPartnerName: '', siQaPartnerEmail: '',

        // System Integrator Leadership
        integratorBusinessLeaderName: '', integratorBusinessLeaderEmail: '',
        integratorPortfolioLeaderName: '', integratorPortfolioLeaderEmail: '',
        integratorServiceLeaderName: '', integratorServiceLeaderEmail: '',
        integratorQaLeaderName: '', integratorQaLeaderEmail: '',

        // Client Project Leadership
        clientProjectProgramManagerName: '', clientProjectProgramManagerEmail: '',
        clientProjectProjectManagerName: '', clientProjectProjectManagerEmail: '',
        clientProjectQaName: '', clientProjectQaEmail: '',

        // Client Leadership
        clientBusinessSponsorName: '', clientBusinessSponsorEmail: '',
        clientBusinessLeaderName: '', clientBusinessLeaderEmail: '',

        // High Level Timeline Details
        plannedStartDate: '',
        plannedEndDate: '',
        totalDuration: '',
        isLock: 'false',
        deleteStatus: 'false',
        saveDraft: false
    });

    const [loading, setLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = useRef(null);

    const showNotification = (message, type) => {
        if (type === 'success') {
            setSuccessMessage(message);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
        } else {
            setErrorMessage(message);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
        }
    };

    // Email validation function
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };



    const saveProject = async (isDraft = false) => {
        setLoading(true);

        try {
            const idToken = await getCachedToken();
            if (!idToken) {
                handleAuthError('Authentication required');
                setLoading(false);
                return;
            }

            const payload = {
                Subscription_License: formData.subscriptionLicense,
                Project_ID: formData.projectId,
                Project_Sequence: formData.projectSequence,
                Start_Date_License: formData.startDate,
                End_date_Licensec: formData.endDate, // Note: Backend expects 'End_date_Licensec'
                Legal_Company_Name: formData.legalCompanyName,
                Project_Name: formData.projectName,
                Primary_Country: formData.primaryCountry,
                Parent_Project_ID: formData.parentProjectId,
                Project_Description: formData.projectDescription,
                Industry_Name: formData.industryName,
                Parent_Project_Name: formData.parentProjectName,
                Project_Type: formData.projectType,
                Deployment_Model: formData.deploymentModel,
                Sector_Name: formData.sectorName,
                Subsector_Name: formData.subsectorName,
                Parent_Project_Description: formData.parentProjectDescription,

                // Leadership - SI
                Lead_Project_Partner: formData.siLeadPartnerName,
                Lead_Project_Partner_email: formData.siLeadPartnerEmail,
                Program_Manager: formData.siProgramManagerName,
                Program_Manager_email: formData.siProgramManagerEmail,
                Project_Manager: formData.siProjectManagerName,
                Project_Manager_email: formData.siProjectManagerEmail,
                Quality_Assurance_Partner: formData.siQaPartnerName,
                Quality_Assurance_Partner_email: formData.siQaPartnerEmail,

                // Leadership - Integrator
                Business_Line_Leader: formData.integratorBusinessLeaderName,
                Business_Line_Leader_email: formData.integratorBusinessLeaderEmail,
                Portfolio_Leader: formData.integratorPortfolioLeaderName,
                Portfolio_Leader_email: formData.integratorPortfolioLeaderEmail,
                Service_Line_Leader: formData.integratorServiceLeaderName,
                Service_Line_Leader_email: formData.integratorServiceLeaderEmail,
                Quality_Assurance_Leader: formData.integratorQaLeaderName,
                Quality_Assurance_Leader_email: formData.integratorQaLeaderEmail,

                // Leadership - Client Project & Client
                Client_Program_Manager: formData.clientProjectProgramManagerName,
                Client_Program_Manager_email: formData.clientProjectProgramManagerEmail,
                Client_Project_Manager: formData.clientProjectProjectManagerName,
                Client_Project_Manager_email: formData.clientProjectProjectManagerEmail,
                Quality_Assurance: formData.clientProjectQaName,
                Quality_Assurance_email: formData.clientProjectQaEmail,
                Business_Executive_Sponsor: formData.clientBusinessSponsorName,
                Business_Executive_Sponsor_email: formData.clientBusinessSponsorEmail,
                Business_Leader: formData.clientBusinessLeaderName,
                Business_Leader_email: formData.clientBusinessLeaderEmail,

                // Timeline
                Planned_Start_Date: formData.plannedStartDate,
                Planned_End_Date: formData.plannedEndDate,
                Total_Duration_Months: formData.totalDuration,
                total_project_allowed: formData.projectSequence.split('of')[1]?.trim() || '5',

                created_by: userId || '1',
                updated_by: userId || '1'
            };

            payload.save_draft = isDraft;

            const url = 'https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/api/rice-project-definition/update-project';

            // Add project_record_id if present
            if (formData.projectRecordId) {
                payload.project_record_id = formData.projectRecordId;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            const result = await response.json();

            if (response.ok && result.success) {
                const message = isDraft ? 'Project draft saved successfully!' : 'Project updated successfully!';

                // Reload data to ensure sync
                await fetchProjectDetails(formData.projectId);
                // Refresh Project ID LOV list
                await fetchUserProjectSpecifics();

                showNotification(message, 'success');

                if (!isDraft) {
                    // Stay on the page as requested
                }
            } else {
                showNotification(DOMPurify.sanitize(result.message || result.error || 'Failed to save project.', { ALLOWED_TAGS: [] }), 'error');
            }
        } catch (err) {
            console.error('Error saving project:', err);
            handleAuthError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDraft = async () => {
        const errors = {};
        if (!formData.subscriptionLicense) {
            errors.subscriptionLicense = 'Please select the Subscription License';
        }
        if (!formData.projectName) {
            errors.projectName = 'Please enter the Project Name';
        }
        if (!formData.projectType) {
            errors.projectType = 'Please enter the Project Type';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            // Scroll to top or to the error if necessary
            return;
        }

        setFieldErrors({});
        await saveProject(true);
    };

    const handleSubmit = async () => {
        setFieldErrors({});
        await saveProject(false);
    };

    const handleLock = async () => {
        setFieldErrors({});
        if (formData.saveDraft) {
            showNotification('Cannot lock a draft project. Please submit the project first.', 'error');
            return;
        }

        setLoading(true);
        const controller = new AbortController();

        try {
            const idToken = await getCachedToken();
            if (!idToken) {
                handleAuthError('Authentication required');
                setLoading(false);
                return;
            }

            const currentLockStatus = formData.isLock === 'true';
            const newLockStatus = !currentLockStatus;

            const payload = {
                project_record_id: formData.projectRecordId,
                isLock: newLockStatus,
                updated_by: userId || '1'
            };

            const response = await fetch('https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/api/rice-project-definition/lock-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            const result = await response.json();

            if (response.ok && result.success) {
                // Reload data to ensure sync
                await fetchProjectDetails(formData.projectId);

                const returnedLockStatus = result.data.isLock;

                const action = returnedLockStatus === 'true' ? 'Locked' : 'Unlocked';
                showNotification(`Project ${action} successfully!`, 'success');
            } else {
                showNotification(DOMPurify.sanitize(result.message || result.error || 'Failed to update lock status.', { ALLOWED_TAGS: [] }), 'error');
            }

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error updating lock status:', err);
                showNotification(DOMPurify.sanitize(err.message || 'An error occurred while updating lock status.', { ALLOWED_TAGS: [] }), 'error');
            }
        } finally {
            setLoading(false);
            controller.abort();
        }
    };

    const handleUpdate = () => {
        // Logic for updating
    };

    const handleReset = () => {
        setSectorOptions([]);
        setSubsectorOptions([]);
        setFormData({
            subscriptionLicense: '',
            projectRecordId: '',
            projectId: 'System Generated',
            projectSequence: '1 of Total Projects Allowed',
            startDate: 'System Data',
            endDate: 'System Data',
            legalCompanyName: 'System Data',
            projectName: '',
            projectDescription: '',
            projectType: '',
            deploymentModel: '',
            primaryCountry: '',
            industryName: '',
            sectorName: '',
            subsectorName: '',
            parentProjectId: '',
            parentProjectName: '',
            parentProjectDescription: '',
            siLeadPartnerName: '', siLeadPartnerEmail: '',
            siProgramManagerName: '', siProgramManagerEmail: '',
            siProjectManagerName: '', siProjectManagerEmail: '',
            siQaPartnerName: '', siQaPartnerEmail: '',
            integratorBusinessLeaderName: '', integratorBusinessLeaderEmail: '',
            integratorPortfolioLeaderName: '', integratorPortfolioLeaderEmail: '',
            integratorServiceLeaderName: '', integratorServiceLeaderEmail: '',
            integratorQaLeaderName: '', integratorQaLeaderEmail: '',
            clientProjectProgramManagerName: '', clientProjectProgramManagerEmail: '',
            clientProjectProjectManagerName: '', clientProjectProjectManagerEmail: '',
            clientProjectQaName: '', clientProjectQaEmail: '',
            clientBusinessSponsorName: '', clientBusinessSponsorEmail: '',
            clientBusinessLeaderName: '', clientBusinessLeaderEmail: '',
            plannedStartDate: '',
            plannedEndDate: '',
            totalDuration: '',
            isLock: 'false',
            deleteStatus: 'false',
            saveDraft: false
        });
        setFieldErrors({});
    };

    const handleSubmitUpdate = () => {
        // Basic validation
        const errors = {};
        if (!formData.subscriptionLicense) {
            errors.subscriptionLicense = 'Please select the Subscription License';
        }
        if (!formData.projectName) {
            errors.projectName = 'Please enter the Project Name';
        }
        if (!formData.projectDescription) {
            errors.projectDescription = 'Please enter the Project Description';
        }
        if (!formData.projectType) {
            errors.projectType = 'Please enter the Project Type';
        }
        if (!formData.deploymentModel) {
            errors.deploymentModel = 'Please enter the Deployment Model';
        }

        // SI Project Leadership Validation
        ['siLeadPartner', 'siProgramManager', 'siProjectManager', 'siQaPartner'].forEach(prefix => {
            if (!formData[`${prefix}Name`]) errors[`${prefix}Name`] = 'Please enter the Name';
            if (!formData[`${prefix}Email`]) {
                errors[`${prefix}Email`] = 'Please enter the Email';
            } else if (!isValidEmail(formData[`${prefix}Email`])) {
                errors[`${prefix}Email`] = 'Please enter a valid email address';
            }
        });

        // System Integrator Leadership Validation
        ['integratorBusinessLeader', 'integratorPortfolioLeader', 'integratorServiceLeader', 'integratorQaLeader'].forEach(prefix => {
            if (!formData[`${prefix}Name`]) errors[`${prefix}Name`] = 'Please enter the Name';
            if (!formData[`${prefix}Email`]) {
                errors[`${prefix}Email`] = 'Please enter the Email';
            } else if (!isValidEmail(formData[`${prefix}Email`])) {
                errors[`${prefix}Email`] = 'Please enter a valid email address';
            }
        });

        // Client Project Leadership Validation
        ['clientProjectProgramManager', 'clientProjectProjectManager', 'clientProjectQa'].forEach(prefix => {
            if (!formData[`${prefix}Name`]) errors[`${prefix}Name`] = 'Please enter the Name';
            if (!formData[`${prefix}Email`]) {
                errors[`${prefix}Email`] = 'Please enter the Email';
            } else if (!isValidEmail(formData[`${prefix}Email`])) {
                errors[`${prefix}Email`] = 'Please enter a valid email address';
            }
        });

        // Client Leadership Validation
        ['clientBusinessSponsor', 'clientBusinessLeader'].forEach(prefix => {
            if (!formData[`${prefix}Name`]) errors[`${prefix}Name`] = 'Please enter the Name';
            if (!formData[`${prefix}Email`]) {
                errors[`${prefix}Email`] = 'Please enter the Email';
            } else if (!isValidEmail(formData[`${prefix}Email`])) {
                errors[`${prefix}Email`] = 'Please enter a valid email address';
            }
        });

        // Date Validation
        if (!formData.plannedStartDate) {
            errors.plannedStartDate = 'Please select Start Date';
        }
        if (!formData.plannedEndDate) {
            errors.plannedEndDate = 'Please select End Date';
        }

        if (formData.plannedStartDate && formData.plannedEndDate) {
            const start = new Date(formData.plannedStartDate);
            const end = new Date(formData.plannedEndDate);
            if (end < start) {
                errors.plannedEndDate = 'End Date cannot be before Start Date';
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            // Scroll to top or to the error if necessary
            return;
        }

        setFieldErrors({});

        handleSubmit();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // If Subscription License changes, clear errors and reset all form data to "New Project" state
        if (name === 'subscriptionLicense') {
            setOrderId(value);
            setProjectId('');
            setProjectName('');
            setFormData({
                subscriptionLicense: value,
                projectRecordId: '',
                projectId: 'System Generated',
                projectSequence: '1 of Total Projects Allowed',
                startDate: '01-JAN-2026',
                endDate: '01-JAN-2027',
                legalCompanyName: 'Deloitte Consulting LLP',
                projectName: '',
                projectDescription: '',
                projectType: '',
                deploymentModel: '',
                primaryCountry: '',
                industryName: '',
                sectorName: '',
                subsectorName: '',
                parentProjectId: '',
                parentProjectName: '',
                parentProjectDescription: '',
                siLeadPartnerName: '', siLeadPartnerEmail: '',
                siProgramManagerName: '', siProgramManagerEmail: '',
                siProjectManagerName: '', siProjectManagerEmail: '',
                siQaPartnerName: '', siQaPartnerEmail: '',
                integratorBusinessLeaderName: '', integratorBusinessLeaderEmail: '',
                integratorPortfolioLeaderName: '', integratorPortfolioLeaderEmail: '',
                integratorServiceLeaderName: '', integratorServiceLeaderEmail: '',
                integratorQaLeaderName: '', integratorQaLeaderEmail: '',
                clientProjectProgramManagerName: '', clientProjectProgramManagerEmail: '',
                clientProjectProjectManagerName: '', clientProjectProjectManagerEmail: '',
                clientProjectQaName: '', clientProjectQaEmail: '',
                clientBusinessSponsorName: '', clientBusinessSponsorEmail: '',
                clientBusinessLeaderName: '', clientBusinessLeaderEmail: '',
                plannedStartDate: '',
                plannedEndDate: '',
                totalDuration: '',
                isLock: 'false',
                deleteStatus: 'false',
                saveDraft: false
            });
            return;
        }

        // Clear field error when user starts typing/selecting
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }

        setFormData(prev => {
            let processedValue = value;

            // Restrict characters for Project Name and all Leadership Names
            const allLeadershipNames = [
                'siLeadPartnerName', 'siProgramManagerName', 'siProjectManagerName', 'siQaPartnerName',
                'integratorBusinessLeaderName', 'integratorPortfolioLeaderName', 'integratorServiceLeaderName', 'integratorQaLeaderName',
                'clientProjectProgramManagerName', 'clientProjectProjectManagerName', 'clientProjectQaName',
                'clientBusinessSponsorName', 'clientBusinessLeaderName'
            ];
            if (name === 'projectName' || allLeadershipNames.includes(name)) {
                // Allows: Alphabets, digits, spaces, &, -, ., ,, ', ‘, ’, (, ), /, _
                processedValue = processedValue.replace(/[^A-Za-z0-9 &.,'‘’()\/_-]/g, '');
            }

            // Capitalize first character of Project Name, Project Description, and all Name fields
            const nameFieldsToCapitalize = [
                'projectName',
                'projectDescription',
                'siLeadPartnerName', 'siProgramManagerName', 'siProjectManagerName', 'siQaPartnerName',
                'integratorBusinessLeaderName', 'integratorPortfolioLeaderName', 'integratorServiceLeaderName', 'integratorQaLeaderName',
                'clientProjectProgramManagerName', 'clientProjectProjectManagerName', 'clientProjectQaName',
                'clientBusinessSponsorName', 'clientBusinessLeaderName'
            ];

            if (nameFieldsToCapitalize.includes(name) && processedValue.length > 0) {
                processedValue = processedValue.charAt(0).toUpperCase() + processedValue.slice(1);
            }

            const updatedData = {
                ...prev,
                [name]: processedValue
            };

            // Auto-generate Project ID when Subscription License changes - REMOVED (Handled by useEffect)
            if (name === 'subscriptionLicense' && !processedValue) {
                updatedData.projectId = 'System Generated';
                updatedData.projectSequence = '1 of Total Projects Allowed';
            }

            // Auto-fill Parent Project details when Name is selected
            if (name === 'parentProjectName') {
                if (processedValue && processedValue !== '') {
                    const selectedParent = parentProjectOptions.find(p => p.value === processedValue);
                    if (selectedParent) {
                        updatedData.parentProjectId = selectedParent.id || '';
                        updatedData.parentProjectDescription = selectedParent.description || '';
                    }
                } else {
                    updatedData.parentProjectName = '';
                    updatedData.parentProjectId = '';
                    updatedData.parentProjectDescription = '';
                }
            }

            // Calculate duration if dates change
            if (name === 'plannedStartDate' || name === 'plannedEndDate') {
                const start = updatedData.plannedStartDate ? new Date(updatedData.plannedStartDate) : null;
                const end = updatedData.plannedEndDate ? new Date(updatedData.plannedEndDate) : null;

                if (start && end && !isNaN(start) && !isNaN(end)) {
                    const diffTime = Math.abs(end - start);
                    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                    updatedData.totalDuration = diffMonths >= 0 ? diffMonths.toString() : '0';
                } else {
                    updatedData.totalDuration = '';
                }
            }

            return updatedData;
        });
    };

    const handleEmailBlur = (e) => {
        const { name, value } = e.target;

        // Only validate if there's a value
        if (value && value.trim() !== '') {
            if (!isValidEmail(value)) {
                setFieldErrors(prev => ({
                    ...prev,
                    [name]: 'Please enter a valid email address'
                }));
            }
        }
    };

    useEffect(() => {
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

    const [projectOptions, setProjectOptions] = useState([]);
    const [userProjectData, setUserProjectData] = useState([]);
    const [licenseOptions, setLicenseOptions] = useState([]);
    const [parentProjectOptions, setParentProjectOptions] = useState([]);
    const [industryHierarchy, setIndustryHierarchy] = useState([]);
    const [industryOptions, setIndustryOptions] = useState([]);
    const [sectorOptions, setSectorOptions] = useState([]);
    const [subsectorOptions, setSubsectorOptions] = useState([]);
    const [nextProjectData, setNextProjectData] = useState({ id: '', sequence: '' });

    const fetchIndustryHierarchy = async () => {
        try {
            const idToken = await getCachedToken();
            const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/industries/hierarchy', {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                setIndustryHierarchy(result);
                setIndustryOptions(result.map(ind => ({ value: ind.Industry_Name, label: ind.Industry_Name })));
            }
        } catch (error) {
            console.error("Error fetching industry hierarchy:", error);
            handleAuthError(error.message);
        }
    };

    const fetchParentProjects = async (subscriptionLicense) => {
        if (!subscriptionLicense) {
            setParentProjectOptions([{ value: '', label: 'Select None', displayValue: '' }]);
            return;
        }

        try {
            const idToken = await getCachedToken();
            const response = await fetch(`https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/rice-project-definition/Parent-Project-by-Subscription_License?SubscriptionLicense=${encodeURIComponent(subscriptionLicense)}`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const mappedOptions = result.data.map(proj => ({
                        value: proj.Project_Name,
                        label: proj.Project_Name,
                        id: proj.Project_ID,
                        description: proj.Project_Description || ''
                    }));
                    // Add "Select None" as the first option
                    setParentProjectOptions([{ value: '', label: 'Select None', displayValue: '' }, ...mappedOptions]);
                }
            } else {
                setParentProjectOptions([{ value: '', label: 'Select None', displayValue: '' }]);
            }
        } catch (error) {
            console.error("Error fetching parent projects:", error);
            setParentProjectOptions([{ value: '', label: 'Select None', displayValue: '' }]);
        }
    };

    const fetchUserProjectSpecifics = async () => {
        if (!userId) return;

        try {
            const idToken = await getCachedToken();
            const userEmail = localStorage.getItem('user_email');
            const response = await fetch(`https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/rice-project-definition/project-details-by-user?userEmail=${userEmail}`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const pData = result.data;
                    const uniqueLicenses = Array.from(new Set(result.data.map(item => item.Subscription_License))).filter(Boolean);
                    
                    const options = uniqueLicenses.map(license => ({
                        value: license,
                        label: license
                    }));
                    setUserProjectData(pData);
                    setLicenseOptions(options);
                }
            }
        } catch (error) {
            console.error("Error fetching user project specifics:", error);
            handleAuthError(error.message);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchUserProjectSpecifics();
        }
    }, [userId]);

    useEffect(() => {
        if (formData.subscriptionLicense) {
            fetchParentProjects(formData.subscriptionLicense);
        } else {
            setParentProjectOptions([{ value: '', label: 'Select None', displayValue: '' }]);
        }
    }, [formData.subscriptionLicense]);

    useEffect(() => {
        fetchIndustryHierarchy();
    }, []);

    // Handle Industry Selection
    const handleIndustrySelect = (val) => {
        if (val === formData.industryName) return;

        setFormData(prev => ({
            ...prev,
            industryName: val,
            sectorName: '',
            subsectorName: ''
        }));

        if (val) {
            const industry = industryHierarchy.find(ind => ind.Industry_Name === val);
            if (industry && industry.sectors) {
                setSectorOptions(industry.sectors.map(sec => ({ value: sec.Sector_Name, label: sec.Sector_Name })));
            } else {
                setSectorOptions([]);
            }
        } else {
            setSectorOptions([]);
        }
        setSubsectorOptions([]);
    };

    // Handle Sector Selection
    const handleSectorSelect = (val) => {
        if (val === formData.sectorName) return;

        setFormData(prev => ({
            ...prev,
            sectorName: val,
            subsectorName: ''
        }));

        if (val) {
            const industry = industryHierarchy.find(ind => ind.Industry_Name === formData.industryName);
            const sector = industry?.sectors?.find(sec => sec.Sector_Name === val);
            if (sector && sector.subsectors) {
                setSubsectorOptions(sector.subsectors.map(sub => ({ value: sub.Subsector_Name, label: sub.Subsector_Name })));
            } else {
                setSubsectorOptions([]);
            }
        } else {
            setSubsectorOptions([]);
        }
    };

    // Handle Subsector Selection
    const handleSubsectorSelect = (val) => {
        setFormData(prev => ({
            ...prev,
            subsectorName: val
        }));
    };

    // Populate sector and subsector lists when loading existing data
    useEffect(() => {
        if (industryHierarchy.length > 0 && formData.industryName) {
            const industry = industryHierarchy.find(ind => ind.Industry_Name === formData.industryName);
            if (industry && industry.sectors) {
                setSectorOptions(industry.sectors.map(sec => ({ value: sec.Sector_Name, label: sec.Sector_Name })));

                if (formData.sectorName) {
                    const sector = industry.sectors.find(sec => sec.Sector_Name === formData.sectorName);
                    if (sector && sector.subsectors) {
                        setSubsectorOptions(sector.subsectors.map(sub => ({ value: sub.Subsector_Name, label: sub.Subsector_Name })));
                    }
                }
            }
        }
    }, [industryHierarchy, formData.industryName, formData.sectorName]);

    useEffect(() => {
        if (!formData.subscriptionLicense || userProjectData.length === 0) {
            setProjectOptions([]);
            return;
        }

        // Find the data for the selected license
        const licenseItems = userProjectData.filter(item => item.Subscription_License === formData.subscriptionLicense);

        if (licenseItems && licenseItems.length > 0) {
            const options = licenseItems.map(p => {
                const projectId = p.Project_ID;
                return {
                    value: projectId,
                    label: p.Project_Name || projectId,
                    sublabel: p.Project_Name ? projectId : undefined,
                    displayValue: projectId,
                    sequence: '1',
                    totalAllowed: '5'
                };
            });
            setProjectOptions(options);
        } else {
            setProjectOptions([]);
        }
    }, [formData.subscriptionLicense, userProjectData]);

    const formatDateToDDMMMYYYY = (dateStr) => {
        if (!dateStr) return '';
        const trimmed = dateStr.trim();
        // If it's already in DD-MMM-YYYY format (or similar text based month)
        if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(trimmed)) {
            return trimmed.toUpperCase();
        }
        // If it's DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
            const [day, month, year] = trimmed.split('/');
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const monthIndex = parseInt(month, 10) - 1;
            if (monthIndex >= 0 && monthIndex <= 11) {
                return `${day}-${monthNames[monthIndex]}-${year}`;
            }
        }
        return trimmed;
    };

    const fetchProjectDetails = async (projectId) => {
        setLoading(true);
        const controller = new AbortController();
        try {
            const idToken = await getCachedToken();
            if (!idToken) {
                handleAuthError('Authentication required');
                setLoading(false);
                return;
            }
            const response = await fetch(`https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/api/rice-project-definition/getProjectData?Project_ID=${encodeURIComponent(projectId)}`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                },
                signal: controller.signal
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setLoading(false);
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    setProjectId(projectId);
                    const data = result.data[0];
                    setProjectName(data.Project_Name || '');

                    setFormData(prev => {
                        return {
                            ...prev,
                            subscriptionLicense: DOMPurify.sanitize(String(data.Subscription_License || prev.subscriptionLicense).trim(), { ALLOWED_TAGS: [] }),
                            projectRecordId: DOMPurify.sanitize(String(data.project_record_id || prev.projectRecordId).trim(), { ALLOWED_TAGS: [] }),
                            projectId: DOMPurify.sanitize(String(data.Project_ID || prev.projectId).trim(), { ALLOWED_TAGS: [] }),
                            projectSequence: DOMPurify.sanitize(String(data.Project_Sequence || prev.projectSequence).trim(), { ALLOWED_TAGS: [] }),
                            startDate: formatDateToDDMMMYYYY(DOMPurify.sanitize(String(data.Start_Date_License || prev.startDate).trim(), { ALLOWED_TAGS: [] })),
                            endDate: formatDateToDDMMMYYYY(DOMPurify.sanitize(String(data.End_date_License || data.End_date_Licensec || prev.endDate).trim(), { ALLOWED_TAGS: [] })),
                            legalCompanyName: DOMPurify.sanitize(String(data.Legal_Company_Name || prev.legalCompanyName).trim(), { ALLOWED_TAGS: [] }),
                            projectName: DOMPurify.sanitize(String(data.Project_Name || '').trim(), { ALLOWED_TAGS: [] }),
                            projectDescription: DOMPurify.sanitize(String(data.Project_Description || '').trim(), { ALLOWED_TAGS: [] }),
                            projectType: DOMPurify.sanitize(String(data.Project_Type || '').trim(), { ALLOWED_TAGS: [] }),
                            deploymentModel: DOMPurify.sanitize(String(data.Deployment_Model || '').trim(), { ALLOWED_TAGS: [] }),
                            primaryCountry: DOMPurify.sanitize(String(data.Primary_Country || '').trim(), { ALLOWED_TAGS: [] }),
                            industryName: DOMPurify.sanitize(String(data.Industry_Name || '').trim(), { ALLOWED_TAGS: [] }),
                            sectorName: DOMPurify.sanitize(String(data.Sector_Name || '').trim(), { ALLOWED_TAGS: [] }),
                            subsectorName: DOMPurify.sanitize(String(data.Subsector_Name || '').trim(), { ALLOWED_TAGS: [] }),
                            parentProjectId: DOMPurify.sanitize(String(data.Parent_Project_ID || '').trim(), { ALLOWED_TAGS: [] }),
                            parentProjectName: DOMPurify.sanitize(String(data.Parent_Project_Name || '').trim(), { ALLOWED_TAGS: [] }),
                            parentProjectDescription: DOMPurify.sanitize(String(data.Parent_Project_Description || '').trim(), { ALLOWED_TAGS: [] }),

                            siLeadPartnerName: DOMPurify.sanitize(String(data.Lead_Project_Partner || '').trim(), { ALLOWED_TAGS: [] }),
                            siLeadPartnerEmail: DOMPurify.sanitize(String(data.Lead_Project_Partner_email || '').trim(), { ALLOWED_TAGS: [] }),
                            siProgramManagerName: DOMPurify.sanitize(String(data.Program_Manager || '').trim(), { ALLOWED_TAGS: [] }),
                            siProgramManagerEmail: DOMPurify.sanitize(String(data.Program_Manager_email || '').trim(), { ALLOWED_TAGS: [] }),
                            siProjectManagerName: DOMPurify.sanitize(String(data.Project_Manager || '').trim(), { ALLOWED_TAGS: [] }),
                            siProjectManagerEmail: DOMPurify.sanitize(String(data.Project_Manager_email || '').trim(), { ALLOWED_TAGS: [] }),
                            siQaPartnerName: DOMPurify.sanitize(String(data.Quality_Assurance_Partner || '').trim(), { ALLOWED_TAGS: [] }),
                            siQaPartnerEmail: DOMPurify.sanitize(String(data.Quality_Assurance_Partner_email || '').trim(), { ALLOWED_TAGS: [] }),

                            integratorBusinessLeaderName: DOMPurify.sanitize(String(data.Business_Line_Leader || '').trim(), { ALLOWED_TAGS: [] }),
                            integratorBusinessLeaderEmail: DOMPurify.sanitize(String(data.Business_Line_Leader_email || '').trim(), { ALLOWED_TAGS: [] }),
                            integratorPortfolioLeaderName: DOMPurify.sanitize(String(data.Portfolio_Leader || '').trim(), { ALLOWED_TAGS: [] }),
                            integratorPortfolioLeaderEmail: DOMPurify.sanitize(String(data.Portfolio_Leader_email || '').trim(), { ALLOWED_TAGS: [] }),
                            integratorServiceLeaderName: DOMPurify.sanitize(String(data.Service_Line_Leader || '').trim(), { ALLOWED_TAGS: [] }),
                            integratorServiceLeaderEmail: DOMPurify.sanitize(String(data.Service_Line_Leader_email || '').trim(), { ALLOWED_TAGS: [] }),
                            integratorQaLeaderName: DOMPurify.sanitize(String(data.Quality_Assurance_Leader || '').trim(), { ALLOWED_TAGS: [] }),
                            integratorQaLeaderEmail: DOMPurify.sanitize(String(data.Quality_Assurance_Leader_email || '').trim(), { ALLOWED_TAGS: [] }),

                            clientProjectProgramManagerName: DOMPurify.sanitize(String(data.Client_Program_Manager || '').trim(), { ALLOWED_TAGS: [] }),
                            clientProjectProgramManagerEmail: DOMPurify.sanitize(String(data.Client_Program_Manager_email || '').trim(), { ALLOWED_TAGS: [] }),
                            clientProjectProjectManagerName: DOMPurify.sanitize(String(data.Client_Project_Manager || '').trim(), { ALLOWED_TAGS: [] }),
                            clientProjectProjectManagerEmail: DOMPurify.sanitize(String(data.Client_Project_Manager_email || '').trim(), { ALLOWED_TAGS: [] }),
                            clientProjectQaName: DOMPurify.sanitize(String(data.Quality_Assurance || '').trim(), { ALLOWED_TAGS: [] }),
                            clientProjectQaEmail: DOMPurify.sanitize(String(data.Quality_Assurance_email || '').trim(), { ALLOWED_TAGS: [] }),
                            clientBusinessSponsorName: DOMPurify.sanitize(String(data.Business_Executive_Sponsor || '').trim(), { ALLOWED_TAGS: [] }),
                            clientBusinessSponsorEmail: DOMPurify.sanitize(String(data.Business_Executive_Sponsor_email || '').trim(), { ALLOWED_TAGS: [] }),
                            clientBusinessLeaderName: DOMPurify.sanitize(String(data.Business_Leader || '').trim(), { ALLOWED_TAGS: [] }),
                            clientBusinessLeaderEmail: DOMPurify.sanitize(String(data.Business_Leader_email || '').trim(), { ALLOWED_TAGS: [] }),

                            plannedStartDate: DOMPurify.sanitize(String(data.Planned_Start_Date || '').trim(), { ALLOWED_TAGS: [] }),
                            plannedEndDate: DOMPurify.sanitize(String(data.Planned_End_Date || '').trim(), { ALLOWED_TAGS: [] }),
                            totalDuration: DOMPurify.sanitize(String(data.Total_Duration_Months || '').trim(), { ALLOWED_TAGS: [] }),
                            isLock: DOMPurify.sanitize(String(data.isLock || 'false').trim(), { ALLOWED_TAGS: [] }),
                            deleteStatus: DOMPurify.sanitize(String(data.delete_status || 'false').trim(), { ALLOWED_TAGS: [] }),
                            saveDraft: String(data.save_draft || data.saveDraft || 'false').toLowerCase() === 'true'
                        };
                    });
                }
            } else {
                showNotification('Failed to fetch project details.', 'error');
            }
        } catch (err) {
            console.error('Error fetching project details:', err);
            handleAuthError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formData.projectId && formData.projectId !== 'System Generated') {
            fetchProjectDetails(formData.projectId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleProjectIdChange = (val) => {
        if (val === formData.projectId) return;

        // Clear all field errors when project changes
        setFieldErrors({});

        const selectedProject = projectOptions.find(p => p.value === val);

        // Check if it's a new project (generated ID)
        if (selectedProject && selectedProject.isNewProject) {
            setFormData(prev => ({
                subscriptionLicense: prev.subscriptionLicense,
                projectRecordId: '',
                projectId: val,
                projectSequence: selectedProject.sequence,
                startDate: '01-JAN-2026',
                endDate: '01-JAN-2027',
                legalCompanyName: 'Deloitte Consulting LLP',
                projectName: '',
                projectDescription: '',
                projectType: '',
                deploymentModel: '',
                primaryCountry: 'India',
                industryName: 'Manufacturing',
                sectorName: 'Automotive',
                subsectorName: 'Passenger Vehicles',
                parentProjectId: '',
                parentProjectName: '',
                parentProjectDescription: '',
                siLeadPartnerName: '', siLeadPartnerEmail: '',
                siProgramManagerName: '', siProgramManagerEmail: '',
                siProjectManagerName: '', siProjectManagerEmail: '',
                siQaPartnerName: '', siQaPartnerEmail: '',
                integratorBusinessLeaderName: '', integratorBusinessLeaderEmail: '',
                integratorPortfolioLeaderName: '', integratorPortfolioLeaderEmail: '',
                integratorServiceLeaderName: '', integratorServiceLeaderEmail: '',
                integratorQaLeaderName: '', integratorQaLeaderEmail: '',
                clientProjectProgramManagerName: '', clientProjectProgramManagerEmail: '',
                clientProjectProjectManagerName: '', clientProjectProjectManagerEmail: '',
                clientProjectQaName: '', clientProjectQaEmail: '',
                clientBusinessSponsorName: '', clientBusinessSponsorEmail: '',
                clientBusinessLeaderName: '', clientBusinessLeaderEmail: '',
                plannedStartDate: '',
                plannedEndDate: '',
                totalDuration: '',
                isLock: 'false',
                deleteStatus: 'false',
                saveDraft: false
            }));
            return;
        }

        // If it's an existing project, fetch its details
        if (selectedProject && !selectedProject.isNewProject) {
            setProjectId(val);
            fetchProjectDetails(val);
        } else {
            setFormData(prev => ({
                ...prev,
                projectId: val
            }));
        }
    };

    const isLocked = formData.isLock === 'true';
    const isBasicInfoMissing = !formData.subscriptionLicense || !formData.projectId || formData.projectId === 'System Generated';

    return (
        <>
            <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
                <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>
                    {/* Draft Status Banner */}
                    {formData.saveDraft && (
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
                                This is a saved draft Project. Complete the form and click "Update" to finalize the Project.
                            </div>
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
                            Project Definition Form
                            <button
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

                    {/* Help Modal */}
                    {showHelpPopup && (
                        <div style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3000
                        }}>
                            <div ref={helpPopupRef} style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                                width: '680px',
                                maxWidth: '90vw',
                                maxHeight: '85vh',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative'
                            }}>
                                <div className="help-modal-scroll" style={{
                                    overflowY: 'auto',
                                    padding: '32px',
                                    flex: '1'
                                }}>
                                    <button
                                        onClick={() => setShowHelpPopup(false)}
                                        style={{
                                            position: 'absolute',
                                            top: '16px',
                                            right: '16px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#dc3545'
                                        }}
                                    >
                                        <X size={20} />
                                    </button>

                                    <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
                                        Help &amp; Information
                                    </h3>

                                    <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>

                                        {/* <div style={{
                                        marginBottom: '16px',
                                        backgroundColor: '#fff8e1',
                                        border: '1px solid #f59e0b',
                                        borderRadius: '6px',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'flex-start'
                                    }}>
                                        <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
                                        <span style={{ color: '#92400e', fontWeight: '500' }}>
                                            Creating new projects is currently disabled. This form is available for <strong>viewing and updating existing projects</strong> only.
                                        </span>
                                    </div> */}

                                        <div style={{ marginBottom: '16px' }}>
                                            <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this form?</strong>
                                            <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                                The <strong>Project Definition Form</strong> captures the full identity of an ERP enablement project — including its license, type, deployment model, industry classification, leadership team, and timeline. All other modules in the system are scoped to a project selected here.
                                            </p>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <strong style={{ color: '#1f2937', fontSize: '15px' }}>Key sections of the form</strong>
                                            <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                <li><strong>Subscription License &amp; Project ID</strong> — Select the license to load an existing project. The Project ID and sequence are system-generated.</li>
                                                <li><strong>Project Header</strong> — Core details: name, description, type (e.g., New Implementation), deployment model, primary country, and industry classification.</li>
                                                <li><strong>SI Project Leadership</strong> — Lead Partner, Program Manager, Project Manager, and QA Partner on the SI side.</li>
                                                <li><strong>System Integrator Leadership</strong> — Business, Portfolio, Service Line, and QA leaders from the integrator organization.</li>
                                                <li><strong>Client Project &amp; Client Leadership</strong> — The client's Program Manager, Project Manager, QA, Business Sponsor, and Business Leader.</li>
                                                <li><strong>High Level Timeline</strong> — Planned start and end dates. Total duration is calculated automatically.</li>
                                            </ul>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this form</strong>
                                            <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                <li>Select a <strong>Subscription License</strong> to load the projects associated with it.</li>
                                                <li>Select an existing <strong>Project ID</strong> from the dropdown — the form auto-populates with its saved data.</li>
                                                <li>Make changes and click <strong>Update</strong> to save them.</li>
                                                <li>Use <strong>Save Draft</strong> to save incomplete updates without full validation.</li>
                                                <li>Use the <strong>Lock / Unlock</strong> button to freeze a finalized project and prevent further edits.</li>
                                                <li>Click <strong>Clear</strong> to reset the form fields.</li>
                                            </ul>
                                        </div>

                                        <div style={{ marginBottom: '4px' }}>
                                            <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                            <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                <li>A project with <strong>Draft</strong> status cannot be locked — submit an update first.</li>
                                                <li>All email fields are validated for correct format before saving.</li>
                                                <li>A locked project cannot be edited until it is unlocked.</li>
                                                <li>The selected project is used as context across all other modules in the system.</li>
                                            </ul>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Messages - Fixed Toast Style */}
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

                    {/* Project Definition Screen Section */}
                    <div style={{
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        marginBottom: '1rem',
                        overflow: 'visible'
                    }}>
                        <div style={sectionHeaderStyle}>
                            Project Definition Screen
                        </div>
                        <div style={{ padding: '12px 16px', overflow: 'visible' }}>
                            {/* Row 1 */}
                            <div style={{ marginBottom: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Subscription License <span style={{ color: 'red' }}>*</span></label>
                                        <div style={{ flex: 1 }}>
                                            <CustomAutocomplete
                                                value={formData.subscriptionLicense}
                                                onChange={(val) => handleChange({ target: { name: 'subscriptionLicense', value: val } })}
                                                options={licenseOptions}
                                                placeholder="Select Subscription License..."
                                                error={!!fieldErrors.subscriptionLicense}
                                            />
                                        </div>
                                    </div>
                                    {fieldErrors.subscriptionLicense && (
                                        <div style={{
                                            color: '#d32f2f',
                                            fontSize: '0.75rem',
                                            marginTop: '4px',
                                            marginLeft: '142px' // Align with the field (label width + margin)
                                        }}>
                                            {fieldErrors.subscriptionLicense}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '130px', marginRight: '2px', flexShrink: 0 }}>Project ID <span style={{ color: 'red' }}>*</span></label>
                                        <CustomAutocomplete
                                            value={formData.projectId}
                                            onChange={handleProjectIdChange}
                                            options={formData.subscriptionLicense ? projectOptions : [{ label: 'Select the Subscription License first', value: '', disabled: true }]}
                                            placeholder="Select or Generate Project ID"
                                            error={!!fieldErrors.projectId}
                                        />
                                    </div>
                                    {fieldErrors.projectId && (
                                        <div style={{
                                            color: '#d32f2f',
                                            fontSize: '0.75rem',
                                            marginTop: '4px',
                                            marginLeft: '132px'
                                        }}>
                                            {fieldErrors.projectId}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Project Sequence <span style={{ color: 'red' }}>*</span></label>
                                        <TextField
                                            name="projectSequence"
                                            value={formData.projectSequence}
                                            size="small"
                                            disabled
                                            sx={{
                                                ...textFieldStyle,
                                                flex: 1,
                                                '& .MuiInputBase-input': {
                                                    ...textFieldStyle['& .MuiInputBase-input'],
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#666'
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2 */}
                            <div style={{ marginBottom: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
                                <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Start Date of License <span style={{ color: 'red' }}>*</span></label>
                                        <TextField
                                            name="startDate"
                                            value={formData.startDate}
                                            size="small"
                                            disabled
                                            sx={{
                                                ...textFieldStyle,
                                                flex: 1,
                                                '& .MuiInputBase-input': {
                                                    ...textFieldStyle['& .MuiInputBase-input'],
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#666'
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '130px', marginRight: '2px', flexShrink: 0 }}>End Date of License <span style={{ color: 'red' }}>*</span></label>
                                        <TextField
                                            name="endDate"
                                            value={formData.endDate}
                                            size="small"
                                            disabled
                                            sx={{
                                                ...textFieldStyle,
                                                flex: 1,
                                                '& .MuiInputBase-input': {
                                                    ...textFieldStyle['& .MuiInputBase-input'],
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#666'
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Legal Company Name <span style={{ color: 'red' }}>*</span></label>
                                        <TextField
                                            name="legalCompanyName"
                                            value={formData.legalCompanyName}
                                            size="small"
                                            disabled
                                            sx={{
                                                ...textFieldStyle,
                                                flex: 1,
                                                '& .MuiInputBase-input': {
                                                    ...textFieldStyle['& .MuiInputBase-input'],
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#666'
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>




                    {/* Project Header Information Section */}
                    <div style={{
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        marginBottom: '1rem',
                        overflow: 'visible'
                    }}>
                        <div style={sectionHeaderStyle}>
                            Project Header Information
                        </div>
                        <div style={{ padding: '12px 16px', overflow: 'visible' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
                                {/* Column 1 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Project Name <span style={{ color: 'red' }}>*</span></label>
                                            <TextField
                                                name="projectName"
                                                value={formData.projectName}
                                                onChange={handleChange}
                                                size="small"
                                                disabled={isLocked}
                                                error={!!fieldErrors.projectName}
                                                inputProps={{ maxLength: 100 }}
                                                sx={{
                                                    ...textFieldStyle,
                                                    flex: 1,
                                                    '& .MuiInputBase-root': {
                                                        ...textFieldStyle['& .MuiInputBase-root'],
                                                        backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                    }
                                                }}
                                            />
                                        </div>
                                        {fieldErrors.projectName && (
                                            <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px', marginLeft: '142px' }}>
                                                {fieldErrors.projectName}
                                            </div>
                                        )}
                                        {formData.projectName.length >= 100 && !fieldErrors.projectName && (
                                            <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px', marginLeft: '142px' }}>
                                                Maximum character limit reached (100 characters)
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Project Description <span style={{ color: 'red' }}>*</span></label>
                                            <TextField
                                                name="projectDescription"
                                                value={formData.projectDescription}
                                                onChange={handleChange}
                                                size="small"
                                                disabled={isLocked}
                                                error={!!fieldErrors.projectDescription}
                                                inputProps={{ maxLength: 240 }}
                                                sx={{
                                                    ...textFieldStyle,
                                                    flex: 1,
                                                    '& .MuiInputBase-root': {
                                                        ...textFieldStyle['& .MuiInputBase-root'],
                                                        backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                    }
                                                }}
                                            />
                                        </div>
                                        {fieldErrors.projectDescription && (
                                            <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px', marginLeft: '142px' }}>
                                                {fieldErrors.projectDescription}
                                            </div>
                                        )}
                                        {formData.projectDescription.length >= 240 && !fieldErrors.projectDescription && (
                                            <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px', marginLeft: '142px' }}>
                                                Maximum character limit reached (240 characters)
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Project Type <span style={{ color: 'red' }}>*</span></label>
                                            <div style={{ flex: 1 }}>
                                                <ProjectTypeAutocomplete
                                                    value={formData.projectType}
                                                    onChange={(val) => handleChange({ target: { name: 'projectType', value: val } })}
                                                    disabled={isLocked}
                                                    error={!!fieldErrors.projectType}
                                                />
                                            </div>
                                        </div>
                                        {fieldErrors.projectType && (
                                            <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px', marginLeft: '142px' }}>
                                                {fieldErrors.projectType}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Deployment Model <span style={{ color: 'red' }}>*</span></label>
                                            <div style={{ flex: 1 }}>
                                                <DeploymentModelAutocomplete
                                                    value={formData.deploymentModel}
                                                    onChange={(val) => handleChange({ target: { name: 'deploymentModel', value: val } })}
                                                    disabled={isLocked}
                                                    error={!!fieldErrors.deploymentModel}
                                                />
                                            </div>
                                        </div>
                                        {fieldErrors.deploymentModel && (
                                            <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px', marginLeft: '142px' }}>
                                                {fieldErrors.deploymentModel}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Column 2 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <label style={{ ...labelStyle, width: '130px', marginRight: '2px', flexShrink: 0 }}>Primary Country <span style={{ color: 'red' }}>*</span></label>
                                        <div style={{ flex: 1 }}>
                                            <PrimaryCountryAutocomplete
                                                projectId={formData.projectId}
                                                value={formData.primaryCountry}
                                                onChange={(val) => handleChange({ target: { name: 'primaryCountry', value: val } })}
                                                disabled={isLocked}
                                                error={!!fieldErrors.primaryCountry}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <label style={{ ...labelStyle, width: '130px', marginRight: '2px', flexShrink: 0 }}>Industry Name <span style={{ color: 'red' }}>*</span></label>
                                        <div style={{ flex: 1 }}>
                                            <CustomAutocomplete
                                                value={formData.industryName}
                                                onChange={handleIndustrySelect}
                                                options={industryOptions}
                                                placeholder="Select Industry..."
                                                disabled={isLocked || !formData.projectId || formData.projectId === 'System Generated'}
                                                error={!!fieldErrors.industryName}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <label style={{ ...labelStyle, width: '130px', marginRight: '2px', flexShrink: 0 }}>Sector Name <span style={{ color: 'red' }}>*</span></label>
                                        <div style={{ flex: 1 }}>
                                            <CustomAutocomplete
                                                value={formData.sectorName}
                                                onChange={handleSectorSelect}
                                                options={sectorOptions}
                                                placeholder="Select Sector..."
                                                disabled={isLocked || !formData.projectId || formData.projectId === 'System Generated' || !formData.industryName}
                                                error={!!fieldErrors.sectorName}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <label style={{ ...labelStyle, width: '130px', marginRight: '2px', flexShrink: 0 }}>Subsector Name <span style={{ color: 'red' }}>*</span></label>
                                        <div style={{ flex: 1 }}>
                                            <CustomAutocomplete
                                                value={formData.subsectorName}
                                                onChange={handleSubsectorSelect}
                                                options={subsectorOptions}
                                                placeholder="Select Subsector..."
                                                disabled={isLocked || !formData.projectId || formData.projectId === 'System Generated' || !formData.sectorName}
                                                error={!!fieldErrors.subsectorName}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Column 3 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <label style={{ ...labelStyle, width: '160px', marginRight: '2px', flexShrink: 0 }}>Parent Project Name</label>
                                        <div style={{ flex: 1 }}>
                                            <CustomAutocomplete
                                                value={formData.parentProjectName}
                                                onChange={(val) => handleChange({ target: { name: 'parentProjectName', value: val } })}
                                                options={parentProjectOptions}
                                                placeholder="Select Parent Project Name..."
                                                disabled={isLocked || !formData.projectId || formData.projectId === 'System Generated'}
                                                error={!!fieldErrors.parentProjectName}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <label style={{ ...labelStyle, width: '160px', marginRight: '2px', flexShrink: 0 }}>Parent Project Description</label>
                                        <TextField
                                            name="parentProjectDescription"
                                            value={formData.parentProjectDescription}
                                            onChange={handleChange}
                                            size="small"
                                            disabled={true}
                                            sx={{
                                                ...textFieldStyle,
                                                flex: 1,
                                                '& .MuiInputBase-root': {
                                                    ...textFieldStyle['& .MuiInputBase-root'],
                                                    backgroundColor: '#f5f5f5'
                                                }
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <label style={{ ...labelStyle, width: '160px', marginRight: '2px', flexShrink: 0 }}>Parent Project ID</label>
                                        <TextField
                                            name="parentProjectId"
                                            value={formData.parentProjectId}
                                            onChange={handleChange}
                                            size="small"
                                            disabled={true}
                                            sx={{
                                                ...textFieldStyle,
                                                flex: 1,
                                                '& .MuiInputBase-root': {
                                                    ...textFieldStyle['& .MuiInputBase-root'],
                                                    backgroundColor: '#f5f5f5'
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Project Leadership Information Section */}
                    <div style={{
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        marginBottom: '1rem',
                        overflow: 'visible'
                    }}>
                        <div style={sectionHeaderStyle}>
                            Project Leadership Information
                        </div>
                        <div style={{ padding: '12px 16px', overflow: 'visible' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', alignItems: 'start' }}>

                                {/* SI Project Leadership */}
                                <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'white' }}>
                                    <div style={sectionHeaderStyle}>SI Project Leadership</div>
                                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'white' }}>
                                        {[
                                            { label: 'Lead Project Partner', namePrefix: 'siLeadPartner' },
                                            { label: 'Program Manager', namePrefix: 'siProgramManager' },
                                            { label: 'Project Manager', namePrefix: 'siProjectManager' },
                                            { label: 'Quality Assurance Partner', namePrefix: 'siQaPartner' }
                                        ].map((field) => (
                                            <div key={field.namePrefix} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                                                <label style={{ ...labelStyle, width: '180px', flexShrink: 0, marginTop: '8px' }}>{field.label} <span style={{ color: 'red' }}>*</span></label>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <TextField
                                                        name={`${field.namePrefix}Name`}
                                                        placeholder="Name"
                                                        value={formData[`${field.namePrefix}Name`]}
                                                        onChange={handleChange}
                                                        size="small"
                                                        disabled={isLocked}
                                                        error={!!fieldErrors[`${field.namePrefix}Name`]}
                                                        inputProps={{ maxLength: 100 }}
                                                        sx={{
                                                            ...textFieldStyle,
                                                            width: '100%',
                                                            '& .MuiInputBase-root': {
                                                                ...textFieldStyle['& .MuiInputBase-root'],
                                                                backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                            }
                                                        }}
                                                    />
                                                    {fieldErrors[`${field.namePrefix}Name`] && fieldErrors[`${field.namePrefix}Name`] !== ' ' && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            {fieldErrors[`${field.namePrefix}Name`]}
                                                        </div>
                                                    )}
                                                    {formData[`${field.namePrefix}Name`] && formData[`${field.namePrefix}Name`].length >= 100 && !fieldErrors[`${field.namePrefix}Name`] && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            Maximum character limit reached (100 characters)
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <TextField
                                                        name={`${field.namePrefix}Email`}
                                                        placeholder="Email Address"
                                                        value={formData[`${field.namePrefix}Email`]}
                                                        onChange={handleChange}
                                                        onBlur={handleEmailBlur}
                                                        size="small"
                                                        disabled={isLocked}
                                                        error={!!fieldErrors[`${field.namePrefix}Email`]}
                                                        sx={{
                                                            ...textFieldStyle,
                                                            width: '100%',
                                                            '& .MuiInputBase-root': {
                                                                ...textFieldStyle['& .MuiInputBase-root'],
                                                                backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                            }
                                                        }}
                                                    />
                                                    {fieldErrors[`${field.namePrefix}Email`] && fieldErrors[`${field.namePrefix}Email`] !== ' ' && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            {fieldErrors[`${field.namePrefix}Email`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* System Integrator Leadership */}
                                <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'white' }}>
                                    <div style={sectionHeaderStyle}>System Integrator Leadership</div>
                                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'white' }}>
                                        {[
                                            { label: 'Business Line Leader', namePrefix: 'integratorBusinessLeader' },
                                            { label: 'Portfolio Leader', namePrefix: 'integratorPortfolioLeader' },
                                            { label: 'Service Line Leader', namePrefix: 'integratorServiceLeader' },
                                            { label: 'Quality Assurance Leader', namePrefix: 'integratorQaLeader' }
                                        ].map((field) => (
                                            <div key={field.namePrefix} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                                                <label style={{ ...labelStyle, width: '180px', flexShrink: 0, marginTop: '8px' }}>{field.label} <span style={{ color: 'red' }}>*</span></label>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <TextField
                                                        name={`${field.namePrefix}Name`}
                                                        placeholder="Name"
                                                        value={formData[`${field.namePrefix}Name`]}
                                                        onChange={handleChange}
                                                        size="small"
                                                        disabled={isLocked}
                                                        error={!!fieldErrors[`${field.namePrefix}Name`]}
                                                        inputProps={{ maxLength: 100 }}
                                                        sx={{
                                                            ...textFieldStyle,
                                                            width: '100%',
                                                            '& .MuiInputBase-root': {
                                                                ...textFieldStyle['& .MuiInputBase-root'],
                                                                backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                            }
                                                        }}
                                                    />
                                                    {fieldErrors[`${field.namePrefix}Name`] && fieldErrors[`${field.namePrefix}Name`] !== ' ' && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            {fieldErrors[`${field.namePrefix}Name`]}
                                                        </div>
                                                    )}
                                                    {formData[`${field.namePrefix}Name`] && formData[`${field.namePrefix}Name`].length >= 100 && !fieldErrors[`${field.namePrefix}Name`] && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            Maximum character limit reached (100 characters)
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <TextField
                                                        name={`${field.namePrefix}Email`}
                                                        placeholder="Email Address"
                                                        value={formData[`${field.namePrefix}Email`]}
                                                        onChange={handleChange}
                                                        onBlur={handleEmailBlur}
                                                        size="small"
                                                        disabled={isLocked}
                                                        error={!!fieldErrors[`${field.namePrefix}Email`]}
                                                        sx={{
                                                            ...textFieldStyle,
                                                            width: '100%',
                                                            '& .MuiInputBase-root': {
                                                                ...textFieldStyle['& .MuiInputBase-root'],
                                                                backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                            }
                                                        }}
                                                    />
                                                    {fieldErrors[`${field.namePrefix}Email`] && fieldErrors[`${field.namePrefix}Email`] !== ' ' && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            {fieldErrors[`${field.namePrefix}Email`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Client Project Leadership */}
                                <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'white' }}>
                                    <div style={sectionHeaderStyle}>Client Project Leadership</div>
                                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'white' }}>
                                        {[
                                            { label: 'Program Manager', namePrefix: 'clientProjectProgramManager' },
                                            { label: 'Project Manager', namePrefix: 'clientProjectProjectManager' },
                                            { label: 'Quality Assurance', namePrefix: 'clientProjectQa' }
                                        ].map((field) => (
                                            <div key={field.namePrefix} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                                                <label style={{ ...labelStyle, width: '180px', flexShrink: 0, marginTop: '8px' }}>{field.label} <span style={{ color: 'red' }}>*</span></label>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <TextField
                                                        name={`${field.namePrefix}Name`}
                                                        placeholder="Name"
                                                        value={formData[`${field.namePrefix}Name`]}
                                                        onChange={handleChange}
                                                        size="small"
                                                        disabled={isLocked}
                                                        error={!!fieldErrors[`${field.namePrefix}Name`]}
                                                        inputProps={{ maxLength: 100 }}
                                                        sx={{
                                                            ...textFieldStyle,
                                                            width: '100%',
                                                            '& .MuiInputBase-root': {
                                                                ...textFieldStyle['& .MuiInputBase-root'],
                                                                backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                            }
                                                        }}
                                                    />
                                                    {fieldErrors[`${field.namePrefix}Name`] && fieldErrors[`${field.namePrefix}Name`] !== ' ' && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            {fieldErrors[`${field.namePrefix}Name`]}
                                                        </div>
                                                    )}
                                                    {formData[`${field.namePrefix}Name`] && formData[`${field.namePrefix}Name`].length >= 100 && !fieldErrors[`${field.namePrefix}Name`] && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            Maximum character limit reached (100 characters)
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <TextField
                                                        name={`${field.namePrefix}Email`}
                                                        placeholder="Email Address"
                                                        value={formData[`${field.namePrefix}Email`]}
                                                        onChange={handleChange}
                                                        onBlur={handleEmailBlur}
                                                        size="small"
                                                        disabled={isLocked}
                                                        error={!!fieldErrors[`${field.namePrefix}Email`]}
                                                        sx={{
                                                            ...textFieldStyle,
                                                            width: '100%',
                                                            '& .MuiInputBase-root': {
                                                                ...textFieldStyle['& .MuiInputBase-root'],
                                                                backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                            }
                                                        }}
                                                    />
                                                    {fieldErrors[`${field.namePrefix}Email`] && fieldErrors[`${field.namePrefix}Email`] !== ' ' && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            {fieldErrors[`${field.namePrefix}Email`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Client Leadership */}
                                <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'white' }}>
                                    <div style={sectionHeaderStyle}>Client Leadership</div>
                                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'white' }}>
                                        {[
                                            { label: 'Business Executive Sponsor', namePrefix: 'clientBusinessSponsor' },
                                            { label: 'Business Leader', namePrefix: 'clientBusinessLeader' }
                                        ].map((field) => (
                                            <div key={field.namePrefix} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                                                <label style={{ ...labelStyle, width: '180px', flexShrink: 0, marginTop: '8px' }}>{field.label} <span style={{ color: 'red' }}>*</span></label>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <TextField
                                                        name={`${field.namePrefix}Name`}
                                                        placeholder="Name"
                                                        value={formData[`${field.namePrefix}Name`]}
                                                        onChange={handleChange}
                                                        size="small"
                                                        disabled={isLocked}
                                                        error={!!fieldErrors[`${field.namePrefix}Name`]}
                                                        inputProps={{ maxLength: 100 }}
                                                        sx={{
                                                            ...textFieldStyle,
                                                            width: '100%',
                                                            '& .MuiInputBase-root': {
                                                                ...textFieldStyle['& .MuiInputBase-root'],
                                                                backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                            }
                                                        }}
                                                    />
                                                    {fieldErrors[`${field.namePrefix}Name`] && fieldErrors[`${field.namePrefix}Name`] !== ' ' && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            {fieldErrors[`${field.namePrefix}Name`]}
                                                        </div>
                                                    )}
                                                    {formData[`${field.namePrefix}Name`] && formData[`${field.namePrefix}Name`].length >= 100 && !fieldErrors[`${field.namePrefix}Name`] && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            Maximum character limit reached (100 characters)
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <TextField
                                                        name={`${field.namePrefix}Email`}
                                                        placeholder="Email Address"
                                                        value={formData[`${field.namePrefix}Email`]}
                                                        onChange={handleChange}
                                                        onBlur={handleEmailBlur}
                                                        size="small"
                                                        disabled={isLocked}
                                                        error={!!fieldErrors[`${field.namePrefix}Email`]}
                                                        sx={{
                                                            ...textFieldStyle,
                                                            width: '100%',
                                                            '& .MuiInputBase-root': {
                                                                ...textFieldStyle['& .MuiInputBase-root'],
                                                                backgroundColor: isLocked ? '#f5f5f5' : 'white'
                                                            }
                                                        }}
                                                    />
                                                    {fieldErrors[`${field.namePrefix}Email`] && fieldErrors[`${field.namePrefix}Email`] !== ' ' && (
                                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                                                            {fieldErrors[`${field.namePrefix}Email`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* High Level Timeline Details Section */}
                    <div style={{
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        marginBottom: '1rem',
                        overflow: 'visible'
                    }}>
                        <div style={sectionHeaderStyle}>
                            High Level Timeline Details
                        </div>
                        <div style={{ padding: '12px 16px', overflow: 'visible' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '140px', marginRight: '2px', flexShrink: 0 }}>Planned Start Date <span style={{ color: 'red' }}>*</span></label>
                                        <CustomDatePicker
                                            name="plannedStartDate"
                                            value={formData.plannedStartDate}
                                            onChange={handleChange}
                                            placeholder="Select Date"
                                            disabled={isLocked}
                                            error={!!fieldErrors.plannedStartDate}
                                        />
                                    </div>
                                    {fieldErrors.plannedStartDate && (
                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px', marginLeft: '142px' }}>
                                            {fieldErrors.plannedStartDate}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '130px', marginRight: '2px', flexShrink: 0 }}>Planned End Date <span style={{ color: 'red' }}>*</span></label>
                                        <CustomDatePicker
                                            name="plannedEndDate"
                                            value={formData.plannedEndDate}
                                            onChange={handleChange}
                                            placeholder="Select Date"
                                            disabled={isLocked}
                                            error={!!fieldErrors.plannedEndDate}
                                        />
                                    </div>
                                    {fieldErrors.plannedEndDate && (
                                        <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px', marginLeft: '132px' }}>
                                            {fieldErrors.plannedEndDate}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <label style={{ ...labelStyle, width: '160px', marginRight: '2px', flexShrink: 0 }}>Total Duration (in Months)</label>
                                        <TextField
                                            name="totalDuration"
                                            value={formData.totalDuration}
                                            placeholder="Calculated"
                                            size="small"
                                            disabled
                                            sx={{
                                                ...textFieldStyle,
                                                flex: 1,
                                                '& .MuiInputBase-root': {
                                                    ...textFieldStyle['& .MuiInputBase-root'],
                                                    height: '40px',
                                                },
                                                '& .MuiInputBase-input': {
                                                    ...textFieldStyle['& .MuiInputBase-input'],
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#666',
                                                    height: '25px',
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={handleLock}
                            disabled={loading || formData.saveDraft || isBasicInfoMissing}
                            style={{
                                backgroundColor: (loading || formData.saveDraft || isBasicInfoMissing) ? '#6c757d' : (formData.isLock === 'true' ? '#dc3545' : '#17a2b8'),
                                color: 'white',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '6px',
                                cursor: (loading || formData.saveDraft || isBasicInfoMissing) ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                opacity: (loading || formData.saveDraft || isBasicInfoMissing) ? 0.6 : 1,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && !formData.saveDraft && !isBasicInfoMissing) {
                                    e.target.style.backgroundColor = formData.isLock === 'true' ? '#c82333' : '#156a8a';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading && !formData.saveDraft && !isBasicInfoMissing) {
                                    e.target.style.backgroundColor = formData.isLock === 'true' ? '#dc3545' : '#17a2b8';
                                }
                            }}
                        >
                            {formData.isLock === 'true' ? <Unlock size={16} /> : <Lock size={16} />}
                            {formData.isLock === 'true' ? 'Unlock' : 'Lock'}
                        </button>
                            <button
                                type="button"
                                onClick={handleSaveDraft}
                                disabled={loading || isLocked || isBasicInfoMissing}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: (loading || isLocked || isBasicInfoMissing) ? '#6c757d' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: (loading || isLocked || isBasicInfoMissing) ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s',
                                    opacity: (loading || isLocked || isBasicInfoMissing) ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => !loading && !isLocked && !isBasicInfoMissing && (e.target.style.backgroundColor = '#2563eb')}
                                onMouseLeave={(e) => !loading && !isLocked && !isBasicInfoMissing && (e.target.style.backgroundColor = '#3b82f6')}
                            >
                                {loading ? 'Saving Draft...' : 'Save Draft'}
                            </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={loading || isLocked}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: (loading || isLocked) ? '#6c757d' : '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: (loading || isLocked) ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s',
                                opacity: (loading || isLocked) ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => !loading && !isLocked && (e.target.style.backgroundColor = '#c82333')}
                            onMouseLeave={(e) => !loading && !isLocked && (e.target.style.backgroundColor = '#dc3545')}
                        >
                            Clear
                        </button>
                            <button
                                type="button"
                                onClick={handleSubmitUpdate}
                                disabled={loading || isLocked || isBasicInfoMissing}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: (loading || isLocked || isBasicInfoMissing) ? '#6c757d' : '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: (loading || isLocked || isBasicInfoMissing) ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s',
                                    opacity: (loading || isLocked || isBasicInfoMissing) ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => !loading && !isLocked && !isBasicInfoMissing && (e.target.style.backgroundColor = '#218838')}
                                onMouseLeave={(e) => !loading && !isLocked && !isBasicInfoMissing && (e.target.style.backgroundColor = '#28a745')}
                            >
                                {loading ? 'Updating...' : 'Update'}
                            </button>

                    </div>

                </div>
            </div>

            <Loader loading={loading} message="Loading..." />

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
            .help-modal-scroll::-webkit-scrollbar { width: 4px; }
            .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
            .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
            <SessionExpiredPopup />
        </>
    );
};

export default ProjectDefinitionForm;
