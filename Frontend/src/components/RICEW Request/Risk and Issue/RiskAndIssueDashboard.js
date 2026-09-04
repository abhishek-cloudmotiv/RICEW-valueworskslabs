import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';
import { getIdToken } from '../../../utils/cognito-auth';
import { ricewApiClient } from './RiskAndIssueClient';

const RiskAndIssueDashboard = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
  const navigate = useNavigate();
  const { logout } = useSession();
  const handleAuthError = useCallback(() => {
    logout();
  }, [logout]);

  const [filterText, setFilterText] = useState('');
  const [tableSearchText, setTableSearchText] = useState('');
  const [searchError, setSearchError] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isFiltersLoading, setIsFiltersLoading] = useState(true);

  // Filters state
  const [selectedValues, setSelectedValues] = useState({
    projectPhase: [],
    category: [],
    subCategory: [],
    status: [],
    escalationRequired: [],
    impactStream: [],
    impactApplication: [],
    impactModule: []
  });

  const [lovData, setLovData] = useState({
    projectPhase: [],
    category: [],
    subCategory: [],
    status: [],
    escalationRequired: [],
    impactStream: [],
    impactApplication: [],
    impactModule: []
  });

  const [filteredData, setFilteredData] = useState([]);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // Computed filtered data that includes search filtering
  const displayedData = filteredData
    .filter(item => {
      if (!tableSearchText.trim()) return true;
      const searchTerm = tableSearchText.toLowerCase();
      const title = (item.title || '').toLowerCase();
      const displayId = (item.RiskAndIssueDisplayId || '').toLowerCase();
      return title.includes(searchTerm) || displayId.includes(searchTerm);
    })
    .sort((a, b) => {
      const getNum = (id) => {
        if (!id) return 0;
        const match = id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return getNum(b.RiskAndIssueDisplayId) - getNum(a.RiskAndIssueDisplayId);
    });

  const projectId = localStorage.getItem('project_id') || selectedProject?.id;

  // EFFECT: Fetch Dynamic Filter Options
  useEffect(() => {
    const fetchFilters = async () => {
      if (!projectId) return;
      try {
        setIsFiltersLoading(true);
        const idToken = await getIdToken();
        if (!idToken) {
          handleAuthError();
          return;
        }

        const response = await fetch(`${ricewApiClient.defaults.baseURL}/ricew/risk-and-issue-form/getUniqueFilters?projectId=${projectId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            handleAuthError();
            return;
          }
          throw new Error(`Failed to fetch filters: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
          const d = result.data;
          const sanitizeArray = (arr) => (arr || []).map(item => DOMPurify.sanitize(item, { ALLOWED_TAGS: [] }));
          setLovData({
            projectPhase: sanitizeArray(d.project_phases),
            category: sanitizeArray(d.categories),
            subCategory: sanitizeArray(d.sub_categories),
            status: sanitizeArray(d.statuses),
            escalationRequired: sanitizeArray(d.escalation_required),
            impactStream: sanitizeArray(d.streams),
            impactApplication: sanitizeArray(d.applications),
            impactModule: sanitizeArray(d.modules)
          });
        }
      } catch (error) {
        console.error('Error fetching dynamic filters:', error);
      } finally {
        setIsFiltersLoading(false);
      }
    };

    fetchFilters();
  }, [projectId, handleAuthError]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      const isFilterButton = target.closest('[data-filter-button]');
      if (!isFilterButton && !target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async (currentValues = selectedValues, currentSearchText = tableSearchText) => {
    try {
      if (!projectId) return;

      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError();
        return;
      }

      const params = new URLSearchParams();
      params.append('project_id', projectId);

      // if (currentSearchText) params.append('title', currentSearchText);

      // Apply selected dropdown filters
      if (currentValues.projectPhase?.length) currentValues.projectPhase.forEach(v => params.append('project_phase', v));
      if (currentValues.category?.length) currentValues.category.forEach(v => params.append('category', v));
      if (currentValues.subCategory?.length) currentValues.subCategory.forEach(v => params.append('sub_category', v));
      if (currentValues.status?.length) currentValues.status.forEach(v => params.append('status', v));
      if (currentValues.escalationRequired?.length) currentValues.escalationRequired.forEach(v => params.append('escalation_required', v));
      if (currentValues.impactStream?.length) currentValues.impactStream.forEach(v => params.append('stream', v));
      if (currentValues.impactApplication?.length) currentValues.impactApplication.forEach(v => params.append('application', v));
      if (currentValues.impactModule?.length) currentValues.impactModule.forEach(v => params.append('module', v));

      const response = await fetch(`${ricewApiClient.defaults.baseURL}/filter/ricew/allData/risk-and-issue-filter?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        // Sort by RiskAndIssueFormId descending (latest first) and sanitize fields
        const sortedData = result.data.sort((a, b) => {
          const idA = parseInt(a.RiskAndIssueFormId || 0, 10);
          const idB = parseInt(b.RiskAndIssueFormId || 0, 10);
          return idB - idA;
        }).map(item => ({
          ...item,
          RiskAndIssueDisplayId: DOMPurify.sanitize(item.RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] }),
          title: DOMPurify.sanitize(item.title || '', { ALLOWED_TAGS: [] }),
          record_type: DOMPurify.sanitize(item.record_type || '', { ALLOWED_TAGS: [] }),
          riskIssue_status: DOMPurify.sanitize(item.riskIssue_status || '', { ALLOWED_TAGS: [] }),
          status: DOMPurify.sanitize(item.status || '', { ALLOWED_TAGS: [] }),
          riskIssue_stream: DOMPurify.sanitize(item.riskIssue_stream || '', { ALLOWED_TAGS: [] }),
          stream: DOMPurify.sanitize(item.stream || '', { ALLOWED_TAGS: [] }),
          riskIssue_owner: DOMPurify.sanitize(item.riskIssue_owner || '', { ALLOWED_TAGS: [] }),
          owner: DOMPurify.sanitize(item.owner || '', { ALLOWED_TAGS: [] }),
          assigned_to: DOMPurify.sanitize(item.assigned_to || '', { ALLOWED_TAGS: [] }),
          severity: DOMPurify.sanitize(item.severity || '', { ALLOWED_TAGS: [] })
        }));
        setFilteredData(sortedData);
      } else {
        setFilteredData([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setFilteredData([]);
    }
  }, [projectId, selectedValues, tableSearchText, handleAuthError]);

  const clearAllFilters = () => {
    const emptyFilters = {
      projectPhase: [], category: [], subCategory: [], status: [],
      escalationRequired: [], impactStream: [], impactApplication: [], impactModule: []
    };
    setSelectedValues(emptyFilters);
    setTableSearchText('');
    setOpenDropdown(null);
    setFilteredData([]);
    sessionStorage.removeItem('riskAndIssue_selectedValues');
    sessionStorage.removeItem('riskAndIssue_tableSearchText');
  };

  const handleSearchChange = (value) => {
    const maxLength = 100;
    if (value.length > maxLength) {
      setTableSearchText(value.substring(0, maxLength));
      setSearchError(`Search Result cannot exceed ${maxLength} characters`);
      return;
    }
    setTableSearchText(value);
    setSearchError('');
  };

  const handleCreateNewForm = () => {
    localStorage.removeItem('riskIssueFormData'); // Clear for new entries
    navigate('/dashboard/risk-and-issue-form/create');
  };

  const submitFilters = () => {
    setOpenDropdown(null);
    fetchData(selectedValues, tableSearchText);
    sessionStorage.setItem('riskAndIssue_selectedValues', JSON.stringify(selectedValues));
    sessionStorage.setItem('riskAndIssue_tableSearchText', tableSearchText);
  };

  const toggleDropdown = (filterKey) => {
    setOpenDropdown(openDropdown === filterKey ? null : filterKey);
  };

  const toggleFilterValue = (filterKey, value) => {
    setSelectedValues(prev => {
      const currentValues = prev[filterKey] || [];
      const isSelected = currentValues.includes(value);
      return {
        ...prev,
        [filterKey]: isSelected
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value]
      };
    });
  };

  // Restore filter state from sessionStorage on mount and refresh data
  useEffect(() => {
    const storedValues = sessionStorage.getItem('riskAndIssue_selectedValues');
    const storedSearchText = sessionStorage.getItem('riskAndIssue_tableSearchText');

    let parsedValues = selectedValues;
    let parsedSearchText = tableSearchText;

    if (storedValues) {
      try {
        parsedValues = JSON.parse(storedValues);
        setSelectedValues(parsedValues);
      } catch (e) {
        console.error('Error parsing stored values:', e);
      }
    }

    if (storedSearchText !== null && storedSearchText !== undefined) {
      parsedSearchText = storedSearchText;
      setTableSearchText(parsedSearchText);
    }

    // ALWAYS fetch fresh data to avoid stale results from previous sessions
    // while keeping the user's filters intact.
    fetchData(parsedValues, parsedSearchText);
  }, [projectId]);

  // Update session storage
  useEffect(() => {
    sessionStorage.setItem('riskAndIssue_selectedValues', JSON.stringify(selectedValues));
    sessionStorage.setItem('riskAndIssue_tableSearchText', tableSearchText || '');
  }, [selectedValues, tableSearchText]);

  const [maxWidth, setMaxWidth] = useState('1400px');
  const [marginRight, setMarginRight] = useState('30px');

  useEffect(() => {
    const handleZoomChange = () => {
      const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);
      if (zoomLevel <= 60) {
        setMaxWidth('2400px');
        setMarginRight('80px');
      } else if (zoomLevel <= 80) {
        setMaxWidth('1800px');
        setMarginRight('50px');
      } else {
        setMaxWidth('1500px');
        setMarginRight('0px');
      }
    };
    window.addEventListener('resize', handleZoomChange);
    handleZoomChange();
    return () => window.removeEventListener('resize', handleZoomChange);
  }, []);

  const renderFilterDropdown = (filterKey, label) => (
    <div style={{ position: 'relative', width: '140px' }} key={filterKey} className="dropdown-container">
      <button
        data-filter-button="true"
        onClick={() => toggleDropdown(filterKey)}
        style={{
          width: '100%',
          padding: '6px 10px',
          backgroundColor: selectedValues[filterKey].length > 0 ? '#3b82f6' : '#f9f9f9',
          color: selectedValues[filterKey].length > 0 ? 'white' : '#333',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {label} {selectedValues[filterKey].length > 0 ? `(${selectedValues[filterKey].length})` : ''}
      </button>
      {openDropdown === filterKey && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginTop: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {(lovData[filterKey] || []).length > 0 ? (
            (lovData[filterKey] || []).map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  backgroundColor: selectedValues[filterKey].includes(option) ? '#e3f2fd' : 'white',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '12px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues[filterKey].includes(option)}
                  onChange={() => toggleFilterValue(filterKey, option)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                {DOMPurify.sanitize(option, { ALLOWED_TAGS: [] })}
              </label>
            ))
          ) : (
            <div style={{ padding: '10px', fontSize: '11px', color: '#888', textAlign: 'center' }}>No values found</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="config-main" style={{ minHeight: '80vh', paddingBottom: '10px', overflowY: 'visible' }}>
      <div className="dashboard-content" style={{ width: '100%', minWidth: '1000px', maxWidth: 'none', margin: '0', padding: '0' }}>

        {/* Project Info & Create Button */}
        <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
            <button
              onClick={handleCreateNewForm}
              className="add-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#28a745',
                color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                marginRight: marginRight, transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              <Plus size={18} />
              Risk and Issue Form
            </button>
          </div>
        </div>

        <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>Risk and Issue Dashboard</h2>
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
        </div>

        <div style={{ padding: '1.5rem 2rem', backgroundColor: 'white' }}>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 0.5rem 0' }}>General Information</h4>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {renderFilterDropdown('projectPhase', 'Project Phase')}
              {renderFilterDropdown('category', 'Category')}
              {renderFilterDropdown('subCategory', 'Sub-category')}
              {renderFilterDropdown('status', 'Status')}
              {renderFilterDropdown('escalationRequired', 'Escalation Required')}
              <button
                onClick={submitFilters}
                style={{
                  width: '140px', padding: '6px 10px', backgroundColor: '#28a745', color: 'white', border: 'none',
                  borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'background-color 0.2s', marginLeft: '20px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 0.5rem 0' }}>Stream Impact</h4>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {renderFilterDropdown('impactStream', 'Stream')}
              {renderFilterDropdown('impactApplication', 'Application')}
              {renderFilterDropdown('impactModule', 'Module')}

              {/* Spacers to align Clear All under Apply Filters */}
              <div style={{ width: '140px' }}></div>
              <div style={{ width: '140px' }}></div>
              <div style={{ width: '140px', marginLeft: '20px' }}>
                <button
                  onClick={clearAllFilters}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Search Area */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderTop: '1px solid #e9ecef', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#495057', fontWeight: '600' }}>Search Results :</span>
            <div style={{ position: 'relative', width: '300px' }}>
              <input
                type="text"
                placeholder="Search Title or ID..."
                value={tableSearchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${searchError ? '#dc3545' : '#ced4da'}`, borderRadius: '4px', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Record ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Title</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Record Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Stream</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Owner</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Assigned To</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Severity</th>
                </tr>
              </thead>
              <tbody>
                {displayedData.length > 0 ? (
                  displayedData.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                      <td style={{ padding: '12px 16px' }}>{DOMPurify.sanitize(item.RiskAndIssueDisplayId, { ALLOWED_TAGS: [] })}</td>
                      <td
                        style={{ padding: '12px 16px', color: '#007bff', cursor: 'pointer' }}
                        onClick={() => {
                          localStorage.setItem('riskIssueFormData', JSON.stringify(item));
                          navigate(`/dashboard/risk-and-issue-form/edit/${item.RiskAndIssueFormId || item.id}`);
                        }}
                      >
                        {DOMPurify.sanitize(item.title, { ALLOWED_TAGS: [] })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{DOMPurify.sanitize(item.record_type, { ALLOWED_TAGS: [] })}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: (item.riskIssue_status || item.status || '').toLowerCase() === 'new' ? '#eee' : '#e3f2fd',
                          color: (item.riskIssue_status || item.status || '').toLowerCase() === 'new' ? '#666' : '#007bff'
                        }}>
                          {DOMPurify.sanitize(item.riskIssue_status || item.status || 'New', { ALLOWED_TAGS: [] })}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{DOMPurify.sanitize(item.riskIssue_stream || item.stream || '', { ALLOWED_TAGS: [] })}</td>
                      <td style={{ padding: '12px 16px' }}>{DOMPurify.sanitize(item.riskIssue_owner || item.owner || '', { ALLOWED_TAGS: [] })}</td>
                      <td style={{ padding: '12px 16px' }}>{DOMPurify.sanitize(item.assigned_to, { ALLOWED_TAGS: [] })}</td>
                      <td style={{ padding: '12px 16px' }}>{DOMPurify.sanitize(item.severity, { ALLOWED_TAGS: [] })}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#6c757d' }}>
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                      The <strong>Risk and Issue Dashboard</strong> provides a centralised view of all risks and issues logged against the ERP project. It allows project teams to filter, search, and monitor open and resolved risk/issue records across workstreams and project phases.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                      Proactive risk and issue management is critical in ERP programmes. This dashboard gives project managers and workstream leads a single place to track all logged risks and issues, monitor their status, and ensure nothing falls through the cracks during delivery.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Using the filters</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                      Use the filter dropdowns to narrow records by attributes such as Project Phase, Category, Sub-Category, Status, Escalation Required, Impact Stream, Impact Application, and Impact Module. Click <strong>Apply Filters</strong> to load matching records, or <strong>Clear All Filters</strong> to reset. Active filters are highlighted in blue.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li>Select one or more filter values and click <strong>Apply Filters</strong> to load matching risk/issue records.</li>
                      <li>Use the <strong>Search Results</strong> bar to further narrow results by text search.</li>
                      <li>Click a record name or ID (shown in blue) to open and view the full detail form.</li>
                      <li>Click <strong>+ Risk and Issue Form</strong> (top right) to log a new risk or issue.</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li>A project must be selected before records can be loaded.</li>
                      <li>The table is empty until filters are applied and submitted.</li>
                      <li>Both risks and issues are managed in this dashboard — use the Category filter to view one type at a time.</li>
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
      `}</style>
      </div>
    </div>
  );
};

export default RiskAndIssueDashboard;
