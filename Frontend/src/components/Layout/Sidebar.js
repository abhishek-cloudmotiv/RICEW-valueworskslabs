import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, ChevronRight, FileText } from 'lucide-react';

const Sidebar = ({ isOpen, onToggle, activeForm, navigationGuard }) => {
  const navigate = useNavigate();
  const [isProjectCreationExpanded, setIsProjectCreationExpanded] = useState(false);
  const [isGlobalSetupExpanded, setIsGlobalSetupExpanded] = useState(false);
  const [isProjectSetupExpanded, setIsProjectSetupExpanded] = useState(false);
  const [isGeographicalScopeExpanded, setIsGeographicalScopeExpanded] = useState(false);
  const [isRicewExpanded, setIsRicewExpanded] = useState(false);
  const [isRicewMassUploadExpanded, setIsRicewMassUploadExpanded] = useState(false);
  const [isApprovalExpanded, setIsApprovalExpanded] = useState(false);
  const [isEffortExpanded, setIsEffortExpanded] = useState(false);
  const [isDeliverManagerExpanded, setIsDeliverManagerExpanded] = useState(false);
  const [isTechnicalManagerExpanded, setIsTechnicalManagerExpanded] = useState(false);
  const [isRiskIssueChangeExpanded, setIsRiskIssueChangeExpanded] = useState(false);
  const [isResourceExpanded, setIsResourceExpanded] = useState(false);
  const [clickedFormId, setClickedFormId] = useState(null);
  const clickedRouteRef = useRef(null);

  // Handle navigation with guard
  const handleNavigation = (path, formId) => {
    if (navigationGuard) {
      const canNavigate = navigationGuard(`/dashboard/${path}`, formId);
      if (canNavigate) {
        clickedRouteRef.current = path;
        setClickedFormId(formId); // Only set clickedFormId if navigation is allowed
        navigate(`/dashboard/${path}`);
      }
    } else {
      clickedRouteRef.current = path;
      setClickedFormId(formId);
      navigate(`/dashboard/${path}`);
    }
  };

  const projectCreationForms = [
    {
      id: 'project-definition-form',
      title: 'Project Definition Form',
      icon: <FileText size={18} />
    },
    {
      id: 'organization-details',
      title: 'Organization Details (Implementation Partners)',
      icon: <FileText size={18} />
    },
    {
      id: 'process-stream-service-lines-mapping',
      title: 'Process Stream & Service Line Mapping',
      icon: <FileText size={18} />
    },
    {
      id: 'wave-rollout-definitions',
      title: 'Project Implementation Plan',
      icon: <FileText size={18} />
    },
    {
      id: 'project-phase',
      title: 'Project Phases',
      icon: <FileText size={18} />
    },
    {
      id: 'risk-issue-status',
      title: 'Risk / Issue Status',
      icon: <FileText size={18} />
    },
    {
      id: 'project-instances-environments',
      title: 'Project Instances / Environment',
      icon: <FileText size={18} />
    }
  ];

  const globalSetupForms = [
    {
      id: 'oracle-application-process-stream',
      title: 'Oracle Application Suite',
      icon: <FileText size={18} />
    },
    {
      id: 'process-stream-oracle-application',
      title: 'Process Streams',
      icon: <FileText size={18} />
    },
    {
      id: 'process-stream-l0-l1-l2-l3',
      title: 'Process Stream Hierarchy',
      icon: <FileText size={18} />
    },
    {
      id: 'project-role-definition',
      title: 'Project Role Definition',
      icon: <FileText size={18} />
    },
    {
      id: 'list-of-global-region',
      title: 'Global Region Code',
      icon: <FileText size={18} />
    },
    // {
    //   id: 'list-of-system-integrators',
    //   title: 'List of System Integrators',
    //   icon: <FileText size={18} />
    // },
    {
      id: 'list-of-industries',
      title: 'List of Industries',
      icon: <FileText size={18} />
    },
    // {
    //   id: 'master-list-of-third-party-pack',
    //   title: 'Master List of Third Party Package',
    //   icon: <FileText size={18} />
    // },
    {
      id: 'resource-level-definition',
      title: 'Resource Level Definition',
      icon: <FileText size={18} />
    },
    {
      id: 'resource-onboarding-status',
      title: 'Resource Onboarding Status',
      icon: <FileText size={18} />
    },
    {
      id: 'resource-location',
      title: 'Resource Location',
      icon: <FileText size={18} />
    },
    {
      id: 'billing-status',
      title: 'Billing Status',
      icon: <FileText size={18} />
    },
    {
      id: 'ricew-object-type',
      title: 'RICEW Object Type',
      icon: <FileText size={18} />
    },
    {
      id: 'ricew-status',
      title: 'RICEW Status',
      icon: <FileText size={18} />
    },
    {
      id: 'risk-issues-severity',
      title: 'Risk / Issue Severity Status',
      icon: <FileText size={18} />
    },
    {
      id: 'activity-category-subcategory',
      title: 'Activity Category / Subcategory Relationship',
      icon: <FileText size={18} />
    },
    {
      id: 'employment-type',
      title: 'Employment Type',
      icon: <FileText size={18} />
    },
    {
      id: 'master-list-of-countries',
      title: 'Master List of Countries',
      icon: <FileText size={18} />
    },
    {
      id: 'data-migration-master',
      title: 'Data Migration Master',
      icon: <FileText size={18} />
    }
  ];

  const projectSetupForms = [
    {
      id: 'implementation-resource-form',
      title: 'Implementation Resource Dashboard',
      icon: <FileText size={18} />
    },
    {
      id: 'implementation-team-mass-upload',
      title: 'Implementation Team Resource Upload Form',
      icon: <FileText size={18} />,
      route: 'implementation-team-mass-upload'
    },
    {
      id: 'client-resource-form',
      title: 'Client Resource Form',
      icon: <FileText size={18} />
    },
    {
      id: 'client-resource-mass-upload-form',
      title: 'Client Resource Upload Form',
      icon: <FileText size={18} />,
      route: 'client-resource-mass-upload-form'
    },
    // {
    //   id: 'legal-entity-master',
    //   title: 'Legal Entity Master',
    //   icon: <FileText size={18} />
    // }
  ];

  const projectScopeForms = [
    {
      id: 'list-of-countries',
      title: 'Geographical Scope',
      icon: <FileText size={18} />
    },
    {
      id: 'functional-scope',
      title: 'Functional Scope',
      icon: <FileText size={18} />
    },
    {
      id: 'technical-scope',
      title: 'Technical Scope',
      icon: <FileText size={18} />
    },
    {
      id: 'data-migration',
      title: 'Data Migration',
      icon: <FileText size={18} />
    }
  ];

  const ricewForms = [
    {
      id: 'ricew-dashboard',
      title: 'RICEW Dashboard',
      icon: <FileText size={18} />
    },
    {
      id: 'ricew-mass-bulk-upload',
      title: 'RICEW Mass Upload Form',
      icon: <FileText size={18} />,
      route: 'ricew-mass-bulk-upload'
    },
    {
      id: 'approval-dashboard',
      title: 'RICEW Approval Dashboard',
      icon: <FileText size={18} />
    },
    {
      id: 'auto-ricew-ai',
      title: 'Auto RICEW AI',
      icon: <FileText size={18} />
    },
    {
      id: 'functional-specification-assignment-form',
      title: 'Functional Specification Assignment Form',
      icon: <FileText size={18} />
    },
    {
      id: 'initiate-specification-writing-summary',
      title: 'Initiate Functional Specification Writing',
      icon: <FileText size={18} />
    },
    {
      id: 'technical-specification-assignment-form',
      title: 'Technical Specification Assignment Form',
      icon: <FileText size={18} />
    },
    {
      id: 'initiate-technical-writing-summary',
      title: 'Initiate Technical Specification Writing',
      icon: <FileText size={18} />
    },
    {
      id: 'developer-specification-assignment-form',
      title: 'Developer Assignment Form',
      icon: <FileText size={18} />
    },
    {
      id: 'initiate-developer-writing-summary',
      title: 'Initiate Code Development',
      icon: <FileText size={18} />
    },
    {
      id: 'functional-testing-assignment-form',
      title: 'Functional Testing Assignment Form',
      icon: <FileText size={18} />
    },
    {
      id: 'initiate-functional-testing-writing-summary',
      title: 'Initiate Functional Testing',
      icon: <FileText size={18} />
    },
    // {
    //   id: 'ricew-effort-cost-rate-card',
    //   title: 'Populate RICEW records into Project',
    //   icon: <FileText size={18} />,
    //   route: 'ricew-effort-cost-rate-card'
    // },
    {
      id: 'rice-document-dashboard',
      title: 'RICEW Document Dashboard',
      icon: <FileText size={18} />
    },
    {
      id: 'ricew-progress-dashboard',
      title: 'RICEW Progress Dashboard',
      icon: <FileText size={18} />
    }
  ];

  const riskIssueChangeForms = [
    {
      id: 'risk-and-issue-form',
      title: 'Risk and Issue Dashboard',
      icon: <FileText size={18} />
    },
    {
      id: 'risk-and-issue-specification-assignment-form',
      title: 'Risk And Issue Assignment Form',
      icon: <FileText size={18} />
    },
    {
      id: 'initiate-risk-and-issue-writing-summary',
      title: 'Initiate Risk And Issue Resolution',
      icon: <FileText size={18} />
    },
    {
      id: 'change-request-form',
      title: 'Change Request Dashboard',
      icon: <FileText size={18} />
    },
    {
      id: 'change-request-approval-dashboard',
      title: 'Change Request Approval Dashboard',
      icon: <FileText size={18} />
    }
  ];

  const resourceForms = [
    {
      id: 'resource-definition-dashboard',
      title: 'Resource Definition Dashboard',
      icon: <FileText size={18} />,
      route: 'resource-definition-dashboard'
    },
    {
      id: 'resource-definition-mass-upload',
      title: 'Resource Definition Upload form',
      icon: <FileText size={18} />,
      route: 'resource-definition-mass-upload'
    }
  ];

  const approvalForms = [
  ];

  const ricewMassUploadForms = [



  ];

  const effortForms = [
    {
      id: 'resource-rate-card',
      title: 'Resource Rate Card',
      icon: <FileText size={18} />
    },
    {
      id: 'ricew-estimation-model',
      title: 'RICEW Estimation Model (Hours)',
      icon: <FileText size={18} />
    },
    {
      id: 'ricew-resource-task-mapping',
      title: 'RICEW Resource Level / Task Mapping',
      icon: <FileText size={18} />
    },
    {
      id: 'ricew-onsite-offshore-task-map',
      title: 'RICEW Onsite Offshore Task Mapping',
      icon: <FileText size={18} />
    },
    // {
    //   id: 'ricew-organization-task-mapping',
    //   title: 'RICEW Organization Task Mapping',
    //   icon: <FileText size={18} />
    // },
    {
      id: 'ricew-cost-estimates-task-mapping',
      title: 'RICEW Cost Rate Card (Base)',
      icon: <FileText size={18} />
    },
    {
      id: 'ricew-effort-and-cost-estimate',
      title: 'RICEW Effort & Cost Rate Card (YoY)',
      icon: <FileText size={18} />
    },
    {
      id: 'cost-rate-card-projection',
      title: 'Resource Rate Card (YoY)',
      icon: <FileText size={18} />
    }
  ];

  const deliverManagerForms = [
  ];

  const technicalManagerForms = [
  ];

  // Auto-expand menus if a form is active
  useEffect(() => {
    if (activeForm) {
      // Check if active form is in project creation forms
      const isProjectCreationForm = projectCreationForms.some(form => form.id === activeForm);
      if (isProjectCreationForm) {
        setIsProjectCreationExpanded(true);
      }

      // Check if active form is in global setup forms
      const isGlobalSetupForm = globalSetupForms.some(form => form.id === activeForm);
      if (isGlobalSetupForm) {
        setIsGlobalSetupExpanded(true);
      }

      // Check if active form is in project onboarding forms
      const isProjectSetupForm = projectSetupForms.some(form => form.id === activeForm);
      if (isProjectSetupForm) {
        setIsProjectSetupExpanded(true);
      }

      // Check if active form is in geographical scope forms
      const isGeographicalScopeForm = projectScopeForms.some(form => form.id === activeForm);
      if (isGeographicalScopeForm) {
        setIsGeographicalScopeExpanded(true);
      }

      // Check if active form is in RICEW forms
      const isRicewForm = ricewForms.some(form => form.id === activeForm);
      if (isRicewForm) {
        setIsRicewExpanded(true);
      }

      // Check if active form is in Approval forms
      const isApprovalForm = approvalForms.some(form => form.id === activeForm);
      if (isApprovalForm) {
        setIsApprovalExpanded(true);
      }

      // Check if active form is in RICEW Mass Upload forms
      const isRicewMassUploadForm = ricewMassUploadForms.some(form => form.id === activeForm);
      if (isRicewMassUploadForm) {
        setIsRicewMassUploadExpanded(true);
      }

      // Check if active form is in effort forms
      const isEffortForm = effortForms.some(form => form.id === activeForm);
      if (isEffortForm) {
        setIsEffortExpanded(true);
      }

      // Check if active form is in Deliver Manager forms
      const isDeliverManagerForm = deliverManagerForms.some(form => form.id === activeForm);
      if (isDeliverManagerForm) {
        setIsDeliverManagerExpanded(true);
      }

      // Check if active form is in Technical Manager forms
      const isTechnicalManagerForm = technicalManagerForms.some(form => form.id === activeForm);
      if (isTechnicalManagerForm) {
        setIsTechnicalManagerExpanded(true);
      }

      // Check if active form is in Risk / Issues / Change forms
      const isRiskIssueChangeForm = riskIssueChangeForms.some(form => form.id === activeForm);
      if (isRiskIssueChangeForm) {
        setIsRiskIssueChangeExpanded(true);
      }

      // Check if active form is in Resource forms
      const isResourceForm = resourceForms.some(form => form.id === activeForm);
      if (isResourceForm) {
        setIsResourceExpanded(true);
      }
    }

    // Reset clickedFormId only when navigating to a different route than what was clicked.
    // This prevents a cross-group item (e.g. "List of Countries" in Project Creation)
    // from losing its highlight when activeForm updates to the same destination route.
    if (clickedRouteRef.current !== activeForm) {
      clickedRouteRef.current = null;
      setClickedFormId(null);
    }
  }, [activeForm]);

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <style>{`
        .sidebar-content::-webkit-scrollbar,
        .sidebar-forms-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar-content::-webkit-scrollbar-track,
        .sidebar-forms-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        .sidebar-content::-webkit-scrollbar-thumb,
        .sidebar-forms-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        
        .sidebar-content::-webkit-scrollbar-thumb:hover,
        .sidebar-forms-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        /* For Firefox */
        .sidebar-content,
        .sidebar-forms-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.05);
        }
      `}</style>
      <div className="sidebar-header">
        <button className="burger-menu" onClick={onToggle}>
          <Menu size={24} />
        </button>
      </div>
      <div className="sidebar-content" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
        <button
          className="sidebar-btn"
          onClick={() => setIsGlobalSetupExpanded(!isGlobalSetupExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
        >
          <span>Global Setup Module</span>
          {isGlobalSetupExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isGlobalSetupExpanded && (
          <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'none', overflowY: 'visible' }}>
            {globalSetupForms.map(form => {
              const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
              return (
                <button
                  key={form.id}
                  className="sidebar-submenu-btn"
                  onClick={() => handleNavigation(form.id, form.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 15px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    fontWeight: isActive ? '600' : 'normal',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {form.icon}
                  <span style={{ textAlign: 'left', flex: 1, ...form.titleStyle }}>{form.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          className="sidebar-btn"
          onClick={() => setIsProjectCreationExpanded(!isProjectCreationExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
        >
          <span>Project Creation & Project Setups</span>
          {isProjectCreationExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isProjectCreationExpanded && (
          <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            {projectCreationForms.map(form => {
              const routePath = form.route || form.id;
              const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
              return (
                <button
                  key={form.id}
                  className="sidebar-submenu-btn"
                  onClick={() => handleNavigation(routePath, form.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 15px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    fontWeight: isActive ? '600' : 'normal',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {form.icon}
                  <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          className="sidebar-btn"
          onClick={() => setIsEffortExpanded(!isEffortExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
        >
          <span>RICEW Effort & Cost Module</span>
          {isEffortExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isEffortExpanded && (
          <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            {effortForms.map(form => {
              const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
              return (
                <button
                  key={form.id}
                  className="sidebar-submenu-btn"
                  onClick={() => handleNavigation(form.id, form.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 15px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    fontWeight: isActive ? '600' : 'normal',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {form.icon}
                  <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                </button>
              );
            })}
          </div>
        )}


        <button
          className="sidebar-btn"
          onClick={() => setIsProjectSetupExpanded(!isProjectSetupExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
        >
          <span>Project Onboarding Module</span>
          {isProjectSetupExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isProjectSetupExpanded && (
          <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            {projectSetupForms.map(form => {
              const routePath = form.route || form.id;
              const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
              return (
                <button
                  key={form.id}
                  className="sidebar-submenu-btn"
                  onClick={() => handleNavigation(routePath, form.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 15px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    fontWeight: isActive ? '600' : 'normal',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {form.icon}
                  <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          className="sidebar-btn"
          onClick={() => setIsGeographicalScopeExpanded(!isGeographicalScopeExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
        >
          <span>Project Scope</span>
          {isGeographicalScopeExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isGeographicalScopeExpanded && (
          <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            {projectScopeForms.map(form => {
              const routePath = form.route || form.id;
              const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
              return (
                <button
                  key={form.id}
                  className="sidebar-submenu-btn"
                  onClick={() => handleNavigation(routePath, form.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 15px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    fontWeight: isActive ? '600' : 'normal',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {form.icon}
                  <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          className="sidebar-btn"
          onClick={() => setIsRicewExpanded(!isRicewExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
        >
          <span>RICEW Module</span>
          {isRicewExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isRicewExpanded && (
          <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            {ricewForms.map(form => {
              const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
              return (
                <button
                  key={form.id}
                  className="sidebar-submenu-btn"
                  onClick={() => handleNavigation(form.id, form.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 15px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    fontWeight: isActive ? '600' : 'normal',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {form.icon}
                  <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          className="sidebar-btn"
          onClick={() => setIsRiskIssueChangeExpanded(!isRiskIssueChangeExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
        >
          <span>Risk / Issues / Change Module</span>
          {isRiskIssueChangeExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isRiskIssueChangeExpanded && (
          <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            {riskIssueChangeForms.map(form => {
              const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
              return (
                <button
                  key={form.id}
                  className="sidebar-submenu-btn"
                  onClick={() => handleNavigation(form.id, form.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 15px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    fontWeight: isActive ? '600' : 'normal',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {form.icon}
                  <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          className="sidebar-btn"
          onClick={() => setIsResourceExpanded(!isResourceExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
        >
          <span>Resource Management Module</span>
          {isResourceExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isResourceExpanded && (
          <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            {resourceForms.map(form => {
              const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
              return (
                <button
                  key={form.id}
                  className="sidebar-submenu-btn"
                  onClick={() => handleNavigation(form.id, form.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 15px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    fontWeight: isActive ? '600' : 'normal',
                    textAlign: 'left',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {form.icon}
                  <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {approvalForms.length > 0 && (
          <>
            <button
              className="sidebar-btn"
              onClick={() => setIsApprovalExpanded(!isApprovalExpanded)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
            >
              <span>Approval Dashboard</span>
              {isApprovalExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isApprovalExpanded && (
              <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
                {approvalForms.map(form => {
                  const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
                  return (
                    <button
                      key={form.id}
                      className="sidebar-submenu-btn"
                      onClick={() => handleNavigation(form.id, form.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 15px',
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                        border: 'none',
                        borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        borderRadius: '4px',
                        marginBottom: '2px',
                        fontWeight: isActive ? '600' : 'normal',
                        textAlign: 'left',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {form.icon}
                      <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {ricewMassUploadForms.length > 0 && (
          <>
            <button
              className="sidebar-btn"
              onClick={() => setIsRicewMassUploadExpanded(!isRicewMassUploadExpanded)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
            >
              <span>RICEW Mass Upload Module</span>
              {isRicewMassUploadExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isRicewMassUploadExpanded && (
              <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
                {ricewMassUploadForms.map(form => {
                  const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
                  return (
                    <button
                      key={form.id}
                      className="sidebar-submenu-btn"
                      onClick={() => handleNavigation(form.id, form.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 15px',
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                        border: 'none',
                        borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        borderRadius: '4px',
                        marginBottom: '2px',
                        fontWeight: isActive ? '600' : 'normal',
                        textAlign: 'left',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {form.icon}
                      <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {deliverManagerForms.length > 0 && (
          <>
            <button
              className="sidebar-btn"
              onClick={() => setIsDeliverManagerExpanded(!isDeliverManagerExpanded)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
            >
              <span>Delivery Manager</span>
              {isDeliverManagerExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isDeliverManagerExpanded && (
              <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
                {deliverManagerForms.map(form => {
                  const routePath = form.route || form.id;
                  const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
                  return (
                    <button
                      key={form.id}
                      className="sidebar-submenu-btn"
                      onClick={() => handleNavigation(routePath, form.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 15px',
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                        border: 'none',
                        borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        borderRadius: '4px',
                        marginBottom: '2px',
                        fontWeight: isActive ? '600' : 'normal',
                        textAlign: 'left',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {form.icon}
                      <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {technicalManagerForms.length > 0 && (
          <>
            <button
              className="sidebar-btn"
              onClick={() => setIsTechnicalManagerExpanded(!isTechnicalManagerExpanded)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}
            >
              <span>Technical Manager</span>
              {isTechnicalManagerExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isTechnicalManagerExpanded && (
              <div className="sidebar-forms-container" style={{ marginLeft: '15px', marginTop: '5px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
                {technicalManagerForms.map(form => {
                  const routePath = form.route || form.id;
                  const isActive = clickedFormId === form.id || (activeForm === form.id && !clickedFormId);
                  return (
                    <button
                      key={form.id}
                      className="sidebar-submenu-btn"
                      onClick={() => handleNavigation(routePath, form.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 15px',
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                        border: 'none',
                        borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        borderRadius: '4px',
                        marginBottom: '2px',
                        fontWeight: isActive ? '600' : 'normal',
                        textAlign: 'left',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {form.icon}
                      <span style={{ textAlign: 'left', flex: 1 }}>{form.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;