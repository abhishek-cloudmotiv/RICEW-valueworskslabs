import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSession } from '../../context/SessionContext';
import ConfigTable from '../Global Setup Module/ConfigTable';
import OracleApplicationProcessStream from '../Global Setup Module/OracleApplicationProcessStream';
import ProcessStreamOracleApplication from '../Global Setup Module/ProcessStreamOracleApplication';
import ProcessStreamL0L1L2L3 from '../Global Setup Module/ProcessStreamL0L1L2L3';
import ClientRosterFormDetails from '../ClientRosterFormDetails';
import LegalEntityMasterTable from '../LegalEntityMasterTable';
import RoleDefinitionTable from '../Global Setup Module/RoleDefinitionTable';
import GeographyTable from '../Global Setup Module/GeographyTable';
import CountriesTable from '../Project Creation & Setup/CountriesTable';
import FunctionalScope from '../Project Creation & Setup/FunctionalScope';
import DataMigration from '../Project Creation & Setup/DataMigration';
import TechnicalScope from '../Project Creation & Setup/TechnicalScope';
import IndustriesTable from '../Global Setup Module/IndustriesTable';
import DataMigrationMaster from '../Global Setup Module/DataMigrationMaster';
import ThirdPartyPackTable from '../Global Setup Module/ThirdPartyPackTable';
import SystemIntegratorsTable from '../Global Setup Module/SystemIntegratorsTable';
import OrganizationDetailsTable from '../Project Creation & Setup/Organization Implementation/OrganizationDetailsTable';
import ProcessStreamBusinessLinesMapping from '../Project Creation & Setup/ProcessStreamBusinessLinesMapping';
import LevelDefinitionTable from '../Global Setup Module/LevelDefinitionTable';
import OnboardingStatusTable from '../Global Setup Module/OnboardingStatusTable';
import LocationDefinitionTable from '../Global Setup Module/LocationDefinitionTable';
import BillingStatusTable from '../Global Setup Module/BillingStatusTable';
import WaveRolloutDefinition from '../Project Creation & Setup/Wave & Rollout/WaveRolloutDefinition';
import RicewStatusTable from '../Global Setup Module/RicewStatusTable';
import ResourceRosterForm from '../ResourceRosterForm';
import NewRicewDashboard from '../RICEW Request/NewRicewDashboard';
import RiceDocumentDashboard from '../RiceDocumentDashboard';
import ApprovalDashbord from '../RICEW Approval Dashbord/ApprovalDashbord';
import RICEWProgressDashboard from '../RICEW Approval Dashbord/RICEWProgressDashboard';
import ChangeRequestApprovalDashboard from '../RICEW Approval Dashbord/ChangeRequestApprovalDashboard';
import ChangeRequestForm from '../RICEW Request/Change Request/ChangeRequestForm';
import ChangeRequestDashboard from '../RICEW Request/Change Request/ChangeRequestDashboard';
import RiskAndIssueForm from '../RICEW Request/Risk and Issue/RiskAndIssueForm';
import RiskAndIssueDashboard from '../RICEW Request/Risk and Issue/RiskAndIssueDashboard';
import RicewRequestBulkUpload from '../RICEW Request/RicewRequestBulkUpload';
import RICEWEffortCostRateCard from '../RICEW Request/RICEWEffortCostRateCard';
import RosterMassUploadForm from '../Resource Roster Form/RosterMassUploadForm';
import ClientRosterMassUploadForm from '../Resource Roster Form/ClientRosterMassUploadForm';
import RicewRequestFormDetails from '../RICEW Request/RicewRequestFormDetails';
import ResourceRateCardTable from '../Cost Estimation Model/ResourceRateCardTable';
import RicewEstimationModelTable from '../Cost Estimation Model/RicewEstimationModelTable';
import RicewResourceTaskMapping from '../Cost Estimation Model/RicewResourceTaskMapping';
import RicewOnsiteOffshoreTaskMap from '../Cost Estimation Model/RicewOnsiteOffshoreTaskMap';
import RicewOrganizationTaskMapping from '../Cost Estimation Model/RicewOrganizationTaskMapping';
import RicewCostEstimatesTaskMapping from '../Cost Estimation Model/RicewCostEstimatesTaskMapping';
import RicewEffortAndCostEstimate from '../Cost Estimation Model/RicewEffortAndCostEstimate';
import CostRateCardProjection from '../Cost Estimation Model/CostRateCardProjection';
import ProjectDefinitionForm from '../Project Creation & Setup/ProjectDefinitionForm';
import FunctionalSpecificationAssignmentForm from '../Deliver Manager/Functional Specification/FunctionalSpecificationAssignmentForm';
import FunctionalSpecificationViewForm from '../Deliver Manager/Functional Specification/FunctionalSpecificationViewForm';
import InitiateSpecificationWritingSummary from '../Deliver Manager/Functional Specification/InitiateSpecificationWritingSummary';
import SpecificationWriterInitiateWork from '../Deliver Manager/Functional Specification/SpecificationWriterInitiateWork';
import TechnicalSpecificationAssignmentForm from '../Deliver Manager/Technical Specification/TechnicalSpecificationAssignmentForm';
import TechnicalPublicSpecifiacationView from '../Deliver Manager/Technical Specification/TechnicalPublicSpecifiacationView';
import InitiateTechnicalWritingSummary from '../Deliver Manager/Technical Specification/InitiateTechnicalWritingSummary';
import TechnicalSpecificationWriterInitiateWork from '../Deliver Manager/Technical Specification/TechnicalSpecificationWriterInitiateWork';
import DeveloperSpecificationAssignmentForm from '../Deliver Manager/Developer Specification/DeveloperSpecificationAssignmentForm';
import InitiateDeveloperWritingSummary from '../Deliver Manager/Developer Specification/InitiateDeveloperWritingSummary';
import DeveloperSpecificationInitiateWork from '../Deliver Manager/Developer Specification/DeveoperSpecificationInitiateWork';
import ProjectPhase from '../Project Creation & Setup/ProjectPhase';
import RiskIssueStatus from '../Project Creation & Setup/RiskIssueStatus';
import Environments from '../Project Creation & Setup/Environments';
import FunctionalTestingSpecificationAssignmentForm from '../Deliver Manager/Functional Testing Assignment/FunctionalTestingSpecificationAssignmentForm';
import InitiateFunctionalTestingWritingSummary from '../Deliver Manager/Functional Testing Assignment/InitiateFunctionalTestingWritingSummary';
import FunctionalTestingSpecificationInitiateWork from '../Deliver Manager/Functional Testing Assignment/FunctionalTestingSpecificationInitiateWork';
import RiskAndIssueSpecificationAssignmentForm from '../Deliver Manager/Risk And Issue Specification/RiskAndIssueSpecificationAssignmentForm';
import RiskAndIssueSpecificationViewForm from '../Deliver Manager/Risk And Issue Specification/RiskAndIssueSpecificationViewForm';
import InitiateRiskAndIssueWritingSummary from '../Deliver Manager/Risk And Issue Specification/InitiateRiskAndIssueWritingSummary';
import RiskAndIssueWriterInitiateWork from '../Deliver Manager/Risk And Issue Specification/RiskAndIssueWriterInitiateWork';
import RiskIssuesSeverity from '../Global Setup Module/RiskIssuesSeverity';
import CategorySubcategory from '../Global Setup Module/CategorySubcategory';
import AutoRICEWai from '../AutoRICEWai';
import EmploymentType from '../Global Setup Module/EmploymentType';
import MasterListofCountries from '../Global Setup Module/MasterListofCountries';
import ResourceDefinationDashbord from '../Resource Module/ResourceDefinationDashbord';
import ResourceDefinationForm from '../Resource Module/ResourceDefinationForm';
import ResourceDefinitionMassUploadForm from '../Resource Module/ResourceDefinitionMassUploadForm';

const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userName = 'Admin';
  const { userId, projectId, projectName, clearSession } = useSession();
  const selectedProject = useMemo(() => ({
    id: projectId || '',
    name: projectName || '',
    userId: userId
  }), [projectId, projectName, userId]);

  // State for unsaved changes checker from child components
  const [unsavedChangesChecker, setUnsavedChangesChecker] = useState(null);

  // State for navigation guard
  const [showNavigationConfirm, setShowNavigationConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [navigationConfirmMessage, setNavigationConfirmMessage] = useState('');

  // Clear checker when navigating away from pages that set it
  useEffect(() => {
    if (!location.pathname.includes('/process-stream-oracle-application') &&
      !location.pathname.includes('/process-stream-l0-l1-l2-l3') &&
      !location.pathname.includes('/client-resource-form') &&
      !location.pathname.includes('/legal-entity-master') &&
      !location.pathname.includes('/functional-scope') &&
      !location.pathname.includes('/list-of-countries') &&
      !location.pathname.includes('/list-of-system-integrators') &&
      !location.pathname.includes('/list-of-industries') &&
      !location.pathname.includes('/master-list-of-third-party-pack') &&
      !location.pathname.includes('/organization-details') &&
      !location.pathname.includes('/resource-level-definition') &&
      !location.pathname.includes('/resource-onboarding-status') &&
      !location.pathname.includes('/billing-status') &&
      !location.pathname.includes('/resource-location') &&
      !location.pathname.includes('/ricew-object-type') &&
      !location.pathname.includes('/ricew-status') &&
      !location.pathname.includes('/risk-issues-severity') &&
      !location.pathname.includes('/activity-category-subcategory') &&
      !location.pathname.includes('/employment-type') &&
      !location.pathname.includes('/master-list-of-countries') &&
      !location.pathname.includes('/resource-definition-dashboard') &&
      !location.pathname.includes('/resource-definition-form') &&
      !location.pathname.includes('/wave-rollout-definitions') &&
      !location.pathname.includes('/resource-rate-card') &&
      !location.pathname.includes('/ricew-estimation-model') &&
      !location.pathname.includes('/ricew-resource-task-mapping') &&
      !location.pathname.includes('/ricew-onsite-offshore-task-map') &&
      !location.pathname.includes('/ricew-organization-task-mapping') &&
      !location.pathname.includes('/ricew-cost-estimates-task-mapping') &&
      !location.pathname.includes('/ricew-mass-bulk-upload') &&
      !location.pathname.includes('/implementation-team-mass-upload') &&
      !location.pathname.includes('/resource-definition-mass-upload') &&
      !location.pathname.includes('/ricew-effort-cost-rate-card') &&
      !location.pathname.includes('/ricew-effort-and-cost-estimate') &&
      !location.pathname.includes('/cost-rate-card-projection') &&
      !location.pathname.includes('/project-definition-form') &&
      !location.pathname.includes('/auto-ricew-ai') &&
      !location.pathname.includes('/functional-specification-assignment-form') &&
      !location.pathname.includes('/functional-specification-view') &&
      !location.pathname.includes('/technical-specification-assignment-form') &&
      !location.pathname.includes('/initiate-technical-writing-summary') &&
      !location.pathname.includes('/technical-writer-initiate-work') &&
      !location.pathname.includes('/developer-specification-assignment-form') &&
      !location.pathname.includes('/initiate-developer-writing-summary') &&
      !location.pathname.includes('/developer-writer-initiate-work') &&
      !location.pathname.includes('/functional-testing-assignment-form') &&
      !location.pathname.includes('/initiate-functional-testing-writing-summary') &&
      !location.pathname.includes('/functional-testing-writer-initiate-work') &&
      !location.pathname.includes('/risk-and-issue-specification-assignment-form') &&
      !location.pathname.includes('/risk-and-issue-specification-view') &&
      !location.pathname.includes('/initiate-risk-and-issue-writing-summary') &&
      !location.pathname.includes('/risk-and-issue-writer-initiate-work') &&
      !location.pathname.includes('/rice-document-dashboard') &&
      !location.pathname.includes('/risk-and-issue-form') &&
      !location.pathname.includes('/change-request-form') &&
      !location.pathname.includes('/process-stream-service-lines-mapping') &&
      !location.pathname.includes('/project-phase') &&
      !location.pathname.includes('/risk-issue-status') &&
      !location.pathname.includes('/project-instances-environments')) {
      setUnsavedChangesChecker(null);
    }
  }, [location.pathname]);

  const handleBackToLanding = () => {
    navigate('/dashboard');
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    localStorage.removeItem('currentPage');
    await logout();
    clearSession();
    navigate('/login');
  };

  // Navigation guard functions
  const checkNavigationWithUnsavedChanges = (targetPath, formId) => {
    const hasUnsavedChanges = typeof unsavedChangesChecker === 'function' ? unsavedChangesChecker() : false;

    if (hasUnsavedChanges) {
      setPendingNavigation({ path: targetPath, formId });
      setNavigationConfirmMessage('You have unsaved changes. Do you want to continue?');
      setShowNavigationConfirm(true);
      return false; // Prevent navigation
    }
    return true; // Allow navigation
  };

  const handleNavigationConfirmYes = () => {
    setShowNavigationConfirm(false);
    if (pendingNavigation) {
      // Clear unsaved changes checker
      setUnsavedChangesChecker(null);
      // Navigate to the pending path
      navigate(pendingNavigation.path);
      setPendingNavigation(null);
      setNavigationConfirmMessage('');
    }
  };

  const handleNavigationConfirmCancel = () => {
    setShowNavigationConfirm(false);
    setPendingNavigation(null);
    setNavigationConfirmMessage('');
  };

  // Determine active form from current route
  const getActiveForm = () => {
    const path = location.pathname;
    if (path.includes('/process-stream-service-lines-mapping')) return 'process-stream-service-lines-mapping';
    if (path.includes('/project-phase')) return 'project-phase';
    if (path.includes('/risk-issue-status')) return 'risk-issue-status';
    if (path.includes('/project-instances-environments')) return 'project-instances-environments';
    if (path.includes('/oracle-application-process-stream')) return 'oracle-application-process-stream';
    if (path.includes('/process-stream-oracle-application')) return 'process-stream-oracle-application';
    if (path.includes('/process-stream-l0-l1-l2-l3')) return 'process-stream-l0-l1-l2-l3';
    if (path.includes('/client-resource-form')) return 'client-resource-form';
    if (path.includes('/legal-entity-master')) return 'legal-entity-master';
    if (path.includes('/project-role-definition')) return 'project-role-definition';
    if (path.includes('/list-of-global-region')) return 'list-of-global-region';
    if (path.includes('/functional-scope')) return 'functional-scope';
    if (path.includes('/list-of-countries')) {
      return location.search.includes('group=project-creation') ? 'list-of-countries-project-creation' : 'list-of-countries';
    }
    if (path.includes('/data-migration-master')) return 'data-migration-master';
    if (path.includes('/data-migration')) return 'data-migration';
    if (path.includes('/technical-scope')) return 'technical-scope';
    if (path.includes('/list-of-industries')) return 'list-of-industries';
    if (path.includes('/list-of-system-integrators')) return 'list-of-system-integrators';
    if (path.includes('/master-list-of-third-party-pack')) return 'master-list-of-third-party-pack';
    if (path.includes('/organization-details')) return 'organization-details';
    if (path.includes('/resource-level-definition')) return 'resource-level-definition';
    if (path.includes('/resource-onboarding-status')) return 'resource-onboarding-status';
    if (path.includes('/resource-location')) return 'resource-location';
    if (path.includes('/billing-status')) return 'billing-status';
    if (path.includes('/ricew-object-type')) return 'ricew-object-type';
    if (path.includes('/ricew-status')) return 'ricew-status';
    if (path.includes('/risk-issues-severity')) return 'risk-issues-severity';
    if (path.includes('/activity-category-subcategory')) return 'activity-category-subcategory';
    if (path.includes('/employment-type')) return 'employment-type';
    if (path.includes('/master-list-of-countries')) return 'master-list-of-countries';
    if (path.includes('/resource-definition-dashboard') || path.includes('/resource-definition-form')) return 'resource-definition-dashboard';
    if (path.includes('/wave-rollout-definitions')) return 'wave-rollout-definitions';
    if (path.includes('/implementation-resource-form')) return 'implementation-resource-form';
    if (path.includes('/ricew-mass-bulk-upload')) return 'ricew-mass-bulk-upload';
    if (path.includes('/implementation-team-mass-upload')) return 'implementation-team-mass-upload';
    if (path.includes('/resource-definition-mass-upload')) return 'resource-definition-mass-upload';
    if (path.includes('/client-resource-mass-upload-form')) return 'client-resource-mass-upload-form';
    if (path.includes('/ricew-effort-cost-rate-card')) return 'ricew-effort-cost-rate-card';
    if (path.includes('/approval-dashboard') || (location.search.includes('from=approval') && !path.includes('/change-request-form'))) return 'approval-dashboard';
    if (path.includes('/ricew-progress-dashboard')) return 'ricew-progress-dashboard';
    if (path.includes('/change-request-approval-dashboard') || (location.search.includes('from=approval') && path.includes('/change-request-form'))) return 'change-request-approval-dashboard';
    if (path.includes('/rice-document-dashboard')) return 'rice-document-dashboard';
    if (path.includes('/risk-and-issue-form')) return 'risk-and-issue-form';
    if (path.includes('/change-request-form')) return 'change-request-form';
    if (path.includes('/ricew-dashboard')) return 'ricew-dashboard';
    if (path.includes('/resource-rate-card')) return 'resource-rate-card';
    if (path.includes('/ricew-estimation-model')) return 'ricew-estimation-model';
    if (path.includes('/ricew-resource-task-mapping')) return 'ricew-resource-task-mapping';
    if (path.includes('/ricew-onsite-offshore-task-map')) return 'ricew-onsite-offshore-task-map';
    if (path.includes('/ricew-organization-task-mapping')) return 'ricew-organization-task-mapping';
    if (path.includes('/ricew-cost-estimates-task-mapping')) return 'ricew-cost-estimates-task-mapping';
    if (path.includes('/ricew-effort-and-cost-estimate')) return 'ricew-effort-and-cost-estimate';
    if (path.includes('/cost-rate-card-projection')) return 'cost-rate-card-projection';
    if (path.includes('/project-definition-form')) return 'project-definition-form';
    if (path.includes('/auto-ricew-ai')) return 'auto-ricew-ai';
    if (path.includes('/functional-specification-assignment-form')) return 'functional-specification-assignment-form';
    if (path.includes('/functional-specification-view')) {
      if (location.search.includes('from=developer-assignment')) {
        return 'developer-specification-assignment-form';
      }
      if (location.search.includes('from=technical-assignment')) {
        return 'technical-specification-assignment-form';
      }
      return 'functional-specification-assignment-form';
    }
    if (path.includes('/initiate-specification-writing-summary') || path.includes('/specification-writer-initiate-work')) return 'initiate-specification-writing-summary';
    if (path.includes('/technical-specification-assignment-form')) return 'technical-specification-assignment-form';
    if (path.includes('/technical-specification-view')) {
      if (location.search.includes('from=technical-assignment')) {
        return 'technical-specification-assignment-form';
      }
      return 'technical-specification-assignment-form'; // Default
    }
    if (path.includes('/initiate-technical-writing-summary') || path.includes('/technical-writer-initiate-work')) return 'initiate-technical-writing-summary';
    if (path.includes('/developer-specification-assignment-form')) return 'developer-specification-assignment-form';
    if (path.includes('/initiate-developer-writing-summary') || path.includes('/developer-writer-initiate-work')) return 'initiate-developer-writing-summary';
    if (path.includes('/functional-testing-assignment-form')) return 'functional-testing-assignment-form';
    if (path.includes('/initiate-functional-testing-writing-summary') || path.includes('/functional-testing-writer-initiate-work')) return 'initiate-functional-testing-writing-summary';
    if (path.includes('/risk-and-issue-specification-assignment-form')) return 'risk-and-issue-specification-assignment-form';
    if (path.includes('/risk-and-issue-specification-view')) return 'risk-and-issue-specification-assignment-form';
    if (path.includes('/initiate-risk-and-issue-writing-summary') || path.includes('/risk-and-issue-writer-initiate-work')) return 'initiate-risk-and-issue-writing-summary';
    if (path.includes('/rice-document-dashboard')) return 'rice-document-dashboard';
    return null;
  };

  return (
    <div className="dashboard">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeForm={getActiveForm()}
        navigationGuard={checkNavigationWithUnsavedChanges}
      />
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(true)}
          unsavedChangesChecker={unsavedChangesChecker}
        />
        <Routes>
          <Route path="/" element={
            <div className={`dashboard-content ${!sidebarOpen ? 'minimized' : ''}`}>
              <div className="project-info">
                <div className="info-item">
                  <label>Project Name :</label>
                  <span style={{ color: '#007bff' }}>{selectedProject?.name}</span>
                </div>
              </div>
            </div>
          } />
          <Route path="/oracle-application-process-stream" element={
            <OracleApplicationProcessStream
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/process-stream-oracle-application" element={
            <ProcessStreamOracleApplication
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/process-stream-l0-l1-l2-l3" element={
            <ProcessStreamL0L1L2L3
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/client-resource-form" element={
            <ClientRosterFormDetails
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/legal-entity-master" element={
            <LegalEntityMasterTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/project-role-definition" element={
            <RoleDefinitionTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/list-of-global-region" element={
            <GeographyTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/functional-scope" element={
            <FunctionalScope
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/data-migration" element={
            <DataMigration
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
            />
          } />
          <Route path="/technical-scope" element={
            <TechnicalScope
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
            />
          } />
          <Route path="/list-of-countries" element={
            <CountriesTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/list-of-industries" element={
            <IndustriesTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/list-of-system-integrators" element={
            <SystemIntegratorsTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/master-list-of-third-party-pack" element={
            <ThirdPartyPackTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/organization-details" element={
            <OrganizationDetailsTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/process-stream-service-lines-mapping" element={
            <ProcessStreamBusinessLinesMapping
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/project-phase" element={
            <ProjectPhase
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/risk-issue-status" element={
            <RiskIssueStatus
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/project-instances-environments" element={
            <Environments
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/resource-level-definition" element={
            <LevelDefinitionTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/resource-onboarding-status" element={
            <OnboardingStatusTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/resource-location" element={
            <LocationDefinitionTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/billing-status" element={
            <BillingStatusTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/ricew-object-type" element={
            <ConfigTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/ricew-status" element={
            <RicewStatusTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/risk-issues-severity" element={
            <RiskIssuesSeverity
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/activity-category-subcategory" element={
            <CategorySubcategory
              selectedProject={selectedProject}
            />
          } />
          <Route path="/employment-type" element={
            <EmploymentType
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/master-list-of-countries" element={
            <MasterListofCountries
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/data-migration-master" element={
            <DataMigrationMaster
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
            />
          } />
          <Route path="/resource-definition-dashboard" element={
            <ResourceDefinationDashbord
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/resource-definition-form" element={
            <ResourceDefinationForm
              onClose={() => navigate('/dashboard/resource-definition-dashboard')}
              selectedProject={selectedProject}
              onBackToLanding={() => navigate('/dashboard/resource-definition-dashboard')}
            />
          } />
          <Route path="/resource-definition-form/edit/:id" element={
            <ResourceDefinationForm
              onClose={() => navigate('/dashboard/resource-definition-dashboard')}
              selectedProject={selectedProject}
              onBackToLanding={() => navigate('/dashboard/resource-definition-dashboard')}
            />
          } />
          <Route path="/wave-rollout-definitions" element={
            <WaveRolloutDefinition
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/implementation-resource-form/*" element={
            <ResourceRosterForm
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/ricew-dashboard" element={
            <NewRicewDashboard
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/rice-document-dashboard" element={
            <RiceDocumentDashboard
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/risk-and-issue-form" element={
            <RiskAndIssueDashboard
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/risk-and-issue-form/create" element={
            <RiskAndIssueForm
              onClose={() => navigate('/dashboard/risk-and-issue-form')}
              selectedProject={selectedProject}
              onBackToLanding={() => navigate('/dashboard/risk-and-issue-form')}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/risk-and-issue-form/edit/:id" element={
            <RiskAndIssueForm
              onClose={() => navigate('/dashboard/risk-and-issue-form')}
              selectedProject={selectedProject}
              onBackToLanding={() => navigate('/dashboard/risk-and-issue-form')}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/change-request-form" element={
            <ChangeRequestDashboard
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/change-request-form/create" element={
            <ChangeRequestForm
              onClose={() => navigate('/dashboard/change-request-form')}
              selectedProject={selectedProject}
              onBackToLanding={() => navigate('/dashboard/change-request-form')}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/change-request-form/edit/:id" element={
            <ChangeRequestForm
              onClose={() => navigate('/dashboard/change-request-form')}
              selectedProject={selectedProject}
              onBackToLanding={() => navigate('/dashboard/change-request-form')}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/approval-dashboard" element={
            <ApprovalDashbord
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/ricew-progress-dashboard" element={
            <RICEWProgressDashboard
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/change-request-approval-dashboard" element={
            <ChangeRequestApprovalDashboard
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/ricew-mass-bulk-upload" element={
            <RicewRequestBulkUpload
              selectedProject={selectedProject}
              onClose={handleBackToLanding}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/implementation-team-mass-upload" element={
            <RosterMassUploadForm
              selectedProject={selectedProject}
              onClose={handleBackToLanding}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/resource-definition-mass-upload" element={
            <ResourceDefinitionMassUploadForm
              selectedProject={selectedProject}
              onClose={handleBackToLanding}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/client-resource-mass-upload-form" element={
            <ClientRosterMassUploadForm
              selectedProject={selectedProject}
              onClose={handleBackToLanding}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/ricew-effort-cost-rate-card" element={
            <RICEWEffortCostRateCard
              selectedProject={selectedProject}
              onClose={handleBackToLanding}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/ricew-dashboard/RICEW-request-create" element={
            <RicewRequestFormDetails
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/ricew-dashboard/RICEW-request/edit/:id" element={
            <RicewRequestFormDetails
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/resource-rate-card" element={
            <ResourceRateCardTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/ricew-estimation-model" element={
            <RicewEstimationModelTable
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/ricew-resource-task-mapping" element={
            <RicewResourceTaskMapping
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/ricew-onsite-offshore-task-map" element={
            <RicewOnsiteOffshoreTaskMap
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/ricew-organization-task-mapping" element={
            <RicewOrganizationTaskMapping
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/ricew-cost-estimates-task-mapping" element={
            <RicewCostEstimatesTaskMapping
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/ricew-effort-and-cost-estimate" element={
            <RicewEffortAndCostEstimate
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/cost-rate-card-projection" element={
            <CostRateCardProjection
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
              setUnsavedChangesChecker={setUnsavedChangesChecker}
            />
          } />
          <Route path="/project-definition-form" element={
            <ProjectDefinitionForm
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/auto-ricew-ai" element={
            <AutoRICEWai
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
            />
          } />
          <Route path="/functional-specification-assignment-form" element={
            <FunctionalSpecificationAssignmentForm
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/functional-specification-view/:id" element={
            <FunctionalSpecificationViewForm
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
            />
          } />
          <Route path="/initiate-specification-writing-summary" element={
            <InitiateSpecificationWritingSummary
              selectedProject={selectedProject}
            />
          } />
          <Route path="/specification-writer-initiate-work/:id" element={
            <SpecificationWriterInitiateWork
              selectedProject={selectedProject}
            />
          } />
          <Route path="/technical-specification-assignment-form" element={
            <TechnicalSpecificationAssignmentForm
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/technical-specification-view/:id" element={
            <TechnicalPublicSpecifiacationView
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
            />
          } />
          <Route path="/initiate-technical-writing-summary" element={
            <InitiateTechnicalWritingSummary
              selectedProject={selectedProject}
            />
          } />
          <Route path="/technical-writer-initiate-work/:id" element={
            <TechnicalSpecificationWriterInitiateWork
              selectedProject={selectedProject}
            />
          } />
          <Route path="/developer-specification-assignment-form" element={
            <DeveloperSpecificationAssignmentForm
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/initiate-developer-writing-summary" element={
            <InitiateDeveloperWritingSummary
              selectedProject={selectedProject}
            />
          } />
          <Route path="/developer-writer-initiate-work/:id" element={
            <DeveloperSpecificationInitiateWork
              selectedProject={selectedProject}
            />
          } />
          <Route path="/functional-testing-assignment-form" element={
            <FunctionalTestingSpecificationAssignmentForm
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/initiate-functional-testing-writing-summary" element={
            <InitiateFunctionalTestingWritingSummary
              selectedProject={selectedProject}
            />
          } />
          <Route path="/functional-testing-writer-initiate-work/:id" element={
            <FunctionalTestingSpecificationInitiateWork
              selectedProject={selectedProject}
            />
          } />
          <Route path="/risk-and-issue-specification-assignment-form" element={
            <RiskAndIssueSpecificationAssignmentForm
              onClose={handleBackToLanding}
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
              onLogout={handleLogoutClick}
            />
          } />
          <Route path="/risk-and-issue-specification-view/:id" element={
            <RiskAndIssueSpecificationViewForm
              selectedProject={selectedProject}
              onBackToLanding={handleBackToLanding}
            />
          } />
          <Route path="/initiate-risk-and-issue-writing-summary" element={
            <InitiateRiskAndIssueWritingSummary
              selectedProject={selectedProject}
            />
          } />
          <Route path="/risk-and-issue-writer-initiate-work/:id" element={
            <RiskAndIssueWriterInitiateWork
              selectedProject={selectedProject}
            />
          } />

        </Routes>
      </div>

      {showLogoutConfirm && (
        <div className="logout-overlay">
          <div className="logout-popup">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="logout-actions">
              <button
                className="confirm-btn"
                onClick={confirmLogout}
              >
                Yes, Logout
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Confirmation Dialog */}
      {showNavigationConfirm && (
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
          zIndex: 3000
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
              Unsaved Changes
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              {navigationConfirmMessage}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleNavigationConfirmCancel}
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
                onClick={handleNavigationConfirmYes}
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
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;