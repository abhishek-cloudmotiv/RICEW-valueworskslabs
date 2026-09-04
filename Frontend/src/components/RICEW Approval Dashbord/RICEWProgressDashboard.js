import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { getIdToken } from '../../utils/cognito-auth';
import { HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';


const RICEWProgressDashboard = ({ selectedProject }) => {
  const { logout } = useSession();
  const handleAuthError = useCallback(() => {
    logout();
  }, [logout]);

  // Search state
  const [searchRiceId, setSearchRiceId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  const [allRiceItems, setAllRiceItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [timelineData, setTimelineData] = useState(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

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

  // Fetch LOV data
  useEffect(() => {
    const fetchLovData = async () => {
      try {
        setIsLoading(true);
        setFetchError('');
        const projectId = selectedProject?.id || localStorage.getItem('project_id') || '';
        if (!projectId) {
          setFetchError('No Project Selected. Project ID is missing.');
          setAllRiceItems([]);
          return;
        }

        const idToken = await getIdToken();
        if (!idToken) {
          handleAuthError();
          return;
        }

        const endpoint = `https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/ricew/progress-dashboard/lov?Project_id=${projectId}`;
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const response = await fetch(endpoint, { headers });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            handleAuthError();
            return;
          }
          throw new Error(`LOV API returned status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
          const items = result.data.map(item => ({
            riceId: DOMPurify.sanitize(item.RICE_ID || 'Unknown ID', { ALLOWED_TAGS: [] }),
            ricewName: DOMPurify.sanitize(item.RICE_NAME || 'Unknown Name', { ALLOWED_TAGS: [] }),
            ricewDescription: DOMPurify.sanitize(item.RICE_DESCRIPTION || '', { ALLOWED_TAGS: [] }),
            ricewRequestFormId: item.RICEWRequestFormId || '',
            objectType: DOMPurify.sanitize(item.RICEW_TYPE || '—', { ALLOWED_TAGS: [] }),
            complexity: DOMPurify.sanitize(item.RICEW_COMPLEXITY || '—', { ALLOWED_TAGS: [] })
          }));
          items.sort((a, b) => a.riceId.localeCompare(b.riceId));
          setAllRiceItems(items);
        } else {
          setFetchError('LOV API request succeeded but returned invalid data format.');
        }
      } catch (error) {
        console.error('Error fetching LOV data:', error);
        setFetchError(`Error fetching data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLovData();
  }, [selectedProject, handleAuthError]);

  // Fetch Timeline Data
  const fetchTimelineData = useCallback(async (ricewRequestFormId) => {
    if (!ricewRequestFormId) return;
    try {
      setIsTimelineLoading(true);
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError();
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch(`https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/ricew/progress-timeline?RICEWRequestFormId=${ricewRequestFormId}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleAuthError();
          return;
        }
        throw new Error(`Timeline API returned status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setTimelineData(result.data);
      }
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    } finally {
      setIsTimelineLoading(false);
    }
  }, [handleAuthError]);

  const filteredLovItems = useMemo(() => {
    if (!searchRiceId.trim()) return allRiceItems;
    const q = searchRiceId.toLowerCase();
    return allRiceItems.filter(item =>
      item.riceId.toLowerCase().includes(q) || item.ricewName.toLowerCase().includes(q)
    );
  }, [searchRiceId, allRiceItems]);

  const handleSelectItem = (item) => {
    setSearchRiceId(item.riceId);
    setShowDropdown(false);
    fetchTimelineData(item.ricewRequestFormId);
  };

  const handleClear = () => {
    setSearchRiceId('');
    setTimelineData(null);
    setShowDropdown(false);
  };

  const formatToIST = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      let date;
      // Handle pre-formatted IST strings from backend: DD/MM/YYYY HH:mm:ss
      if (String(dateStr).includes('/') && String(dateStr).match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const parts = String(dateStr).split(' ');
          const dParts = parts[0].split('/');
          const tParts = (parts[1] || "00:00:00").split(':');
          // Important: Assume these are already in local context (IST)
          date = new Date(dParts[2], dParts[1] - 1, dParts[0], tParts[0]||0, tParts[1]||0, tParts[2]||0);
      } else {
          // Handle ISO strings or other standard formats
          date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) return dateStr;
      
      // Normalize everything to standard format: 26 MAR 2026 18:04:42
      return date.toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '').toUpperCase();
    } catch (e) {
      return dateStr;
    }
  };

  const selectedLovItem = allRiceItems.find(item => item.riceId === searchRiceId);

  const calculateElapsed = (startStr, endStr) => {
    if (!startStr || !endStr || startStr === "-" || endStr === "-") return "-";
    try {
      const parseDate = (str) => {
        if (!str || str === "-") return null;
        if (str instanceof Date) return str;
        
        // Handle ISO Strings (e.g. 2026-03-31T07:30:28.726Z)
        if (String(str).includes('T') && String(str).includes('Z')) {
            const d = new Date(str);
            if (!isNaN(d.getTime())) return d;
        }

        // Handle DD/MM/YYYY HH:mm:ss
        if (String(str).includes('/')) {
          const mainParts = String(str).split(' ');
          const dateParts = mainParts[0].split('/');
          if (dateParts.length === 3) {
            const [d, m, y] = dateParts;
            const timeParts = (mainParts[1] || "00:00:00").split(':');
            return new Date(y, m - 1, d, timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
          }
        }
        
        // Handle DD MMM YYYY HH:mm:ss
        const months = { 'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5, 'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11 };
        const cleanStr = String(str).replace(/-/g, ' ').toUpperCase();
        const parts = cleanStr.split(' ');
        if (parts.length >= 3) {
          const day = parseInt(parts[0]);
          const month = months[parts[1]];
          const year = parseInt(parts[2]);
          let h = 0, min = 0, s = 0;
          if (parts[3]) {
            const timeParts = parts[3].split(':');
            h = parseInt(timeParts[0]) || 0;
            min = parseInt(timeParts[1]) || 0;
            s = parseInt(timeParts[2]) || 0;
          }
          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day, h, min, s);
          }
        }

        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      };

      const start = parseDate(startStr);
      const end = parseDate(endStr);
      
      if (!start || !end) return "-";

      const diffTime = end - start;
      if (diffTime < 0) return "-";

      const totalDays = diffTime / (1000 * 60 * 60 * 24);
      const roundedDays = Math.round(totalDays);
      
      return `${roundedDays} Day${roundedDays !== 1 ? 's' : ''}`;
    } catch (e) {
      console.error("Elapsed calculation error:", e);
      return "-";
    }
  };

  const dashboardData = useMemo(() => {
    const baseInfo = {
      objectType: selectedLovItem ? selectedLovItem.objectType : "—",
      complexity: selectedLovItem ? selectedLovItem.complexity : "—"
    };

    if (!timelineData) {
      return {
        riceInformation: baseInfo,
        riceDocuments: []
      };
    }

    const { milestones, phases } = timelineData;

    const steps = [
      { id: 1, step: "Rice Request", status: milestones.submission_date ? "Submitted" : "Pending", date: formatToIST(milestones.submission_date), action: "-", rawDate: milestones.submission_date, prevRawDate: null },
      { id: 2, step: "Rice Approval", status: milestones.approval_date ? "Approved" : "Pending", date: formatToIST(milestones.approval_date), action: "Approval", rawDate: milestones.approval_date, prevRawDate: milestones.submission_date },
      { id: 3, step: "Functional Specification Assignment Form", status: phases.functional.assigned ? "Assigned" : "Pending", date: formatToIST(phases.functional.assigned), action: "FS Assignment", rawDate: phases.functional.assigned, prevRawDate: milestones.approval_date },
      { id: 4, step: "Initiate Functional Specification Writing", status: phases.functional.started ? "In Progress" : "Pending", date: formatToIST(phases.functional.started), action: "FS Writing", rawDate: phases.functional.started, prevRawDate: phases.functional.assigned },
      { id: 5, step: "Technical Specification Assignment Form", status: phases.technical.assigned ? "Assigned" : "Pending", date: formatToIST(phases.technical.assigned), action: "TS Assignment", rawDate: phases.technical.assigned, prevRawDate: phases.functional.started },
      { id: 6, step: "Initiate Technical Specification Writing", status: phases.technical.started ? "In Progress" : "Pending", date: formatToIST(phases.technical.started), action: "TS Writing", rawDate: phases.technical.started, prevRawDate: phases.technical.assigned },
      { id: 7, step: "Developer Assignment Form", status: phases.development.assigned ? "Assigned" : "Pending", date: formatToIST(phases.development.assigned), action: "Developer Assignment", rawDate: phases.development.assigned, prevRawDate: phases.technical.started },
      { id: 8, step: "Initiate Code Development", status: phases.development.started ? "In Progress" : "Pending", date: formatToIST(phases.development.started), action: "Code Development", rawDate: phases.development.started, prevRawDate: phases.development.assigned },
      { id: 9, step: "Functional Testing Assignment", status: phases.testing.assigned ? "Assigned" : "Pending", date: formatToIST(phases.testing.assigned), action: "FUT Assignment", rawDate: phases.testing.assigned, prevRawDate: phases.development.started },
      { id: 10, step: "Initiate Functional Testing", status: phases.testing.started ? "In Progress" : "Pending", date: formatToIST(phases.testing.started), action: "FUT Work In Progress", rawDate: phases.testing.started, prevRawDate: phases.testing.assigned },
      { id: 11, step: "Client Approval", status: milestones.completion_date ? "Complete" : "Pending", date: formatToIST(milestones.completion_date), action: "Client Testing", rawDate: milestones.completion_date, prevRawDate: phases.testing.started }
    ];

    const processedSteps = steps.map(s => ({
      ...s,
      elapsedDays: s.prevRawDate ? calculateElapsed(s.prevRawDate, s.rawDate) : "-"
    }));

    // Calculate total elapsed
    const totalDays = calculateElapsed(milestones.submission_date, milestones.completion_date || new Date().toISOString());

    processedSteps.push({
      id: 12,
      step: "Total Time Elapsed for the Object",
      status: "-",
      date: "-",
      action: "-",
      elapsedDays: totalDays,
      isTotal: true
    });

    return {
      riceInformation: baseInfo,
      riceDocuments: processedSteps
    };
  }, [timelineData, selectedLovItem]);


  return (
    <div className="config-main" style={{ minHeight: '80vh', width: 'calc(98% - 2rem)', margin: '2rem auto', marginLeft: '2rem', marginRight: '2rem', paddingBottom: '20px', overflowY: 'visible' }}>
      <div className="dashboard-content" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0' }}>

        {/* Project Info */}
        <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
          </div>
        </div>

        <div className="config-header" style={{
            marginTop: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 2rem'
        }}>
          <h2 style={{ margin: 0 }}>RICEW Progress Dashboard</h2>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
                onClick={() => setShowHelpPopup(!showHelpPopup)}
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
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d495c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}
            >
                <HelpCircle size={18} />
                Help
            </button>

            {/* Help Modal Overlay */}
            {showHelpPopup && (
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
                    zIndex: 30000,
                    padding: '20px'
                }}>
                    <div
                        ref={helpPopupRef}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            width: '100%',
                            maxWidth: '800px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                        }}
                    >
                        <div className="help-modal-scroll" style={{
                            overflowY: 'auto',
                            padding: '32px',
                            textAlign: 'left',
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
                            <h3 style={{
                                margin: '0 0 16px 0',
                                color: '#333',
                                fontSize: '18px',
                                fontWeight: '600'
                            }}>
                                Help & Information
                            </h3>
                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        The <strong>Progress Dashboard</strong> lets you track the timeline and status of individual RICEW requests.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        This dashboard provides visibility into the lifecycle of a RICEW object, showing when it moved through various stages like submission, approval, development, and testing, along with the time taken at each step.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Step</strong> — The specific milestone or phase in the RICEW lifecycle.</li>
                                        <li><strong>Status</strong> — The current status of the step (e.g., Pending, Completed, In Progress).</li>
                                        <li><strong>Date</strong> — The timestamp when the step was reached or updated.</li>
                                        <li><strong>Action</strong> — The corresponding action taken at that step.</li>
                                        <li><strong>Total Time Elapsed</strong> — The time taken to reach this step from the previous one.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to make changes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Select a RICEW Object from the <strong>Search Results</strong> dropdown.</li>
                                        <li>The dashboard will display its type, complexity, and full progress timeline.</li>
                                        <li>This is a read-only view; no changes can be made here.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>A project must be selected to use this dashboard.</li>
                                        <li>The timeline is automatically updated as the RICEW request progresses through other forms.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Top Spacer / Border area matching other components */}
        <div style={{
          padding: '1rem 1rem 1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'white',
          borderTop: '1px solid #f0f0f0'
        }}>
        </div>

        {/* Unified Scrollable Table Container */}
        <div style={{ backgroundColor: '#f8f9fa', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ minWidth: '1000px', boxSizing: 'border-box' }}>

            {/* RICE Information Group Header with Search */}
            <div style={{ display: 'flex', backgroundColor: '#f8f9fa' }}>
              <div style={{
                padding: '12px 24px',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #ddd',
                borderBottom: '1px solid #ddd',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                <span style={{ fontSize: '14px', color: '#495057', fontWeight: '600', whiteSpace: 'nowrap' }}>Search Results :</span>
                <div style={{ position: 'relative', flex: '0 0 450px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}>
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search RICEW ID or Object Name..."
                      value={searchRiceId}
                      onChange={(e) => { setSearchRiceId(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      style={{
                        width: '100%',
                        padding: '10px 15px 10px 40px',
                        fontSize: '14px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                    />
                    {searchRiceId && (
                      <button
                        onClick={handleClear}
                        style={{
                          position: 'absolute', right: '10px',
                          background: 'none', border: 'none',
                          cursor: 'pointer', color: '#999',
                          fontSize: '16px', display: 'flex', alignItems: 'center', padding: '5px'
                        }}
                      >✕</button>
                    )}
                  </div>

                  {showDropdown && filteredLovItems.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '0 0 6px 6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      maxHeight: '250px',
                      overflowY: 'auto',
                      marginTop: '1px'
                    }} className="thin-scroll">
                      {filteredLovItems.map((item) => (
                        <div
                          key={item.riceId}
                          onClick={() => handleSelectItem(item)}
                          style={{
                            padding: '10px 15px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: 'white',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{DOMPurify.sanitize(item.riceId, { ALLOWED_TAGS: [] })}</div>
                          <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{DOMPurify.sanitize(item.ricewName, { ALLOWED_TAGS: [] })}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RICE Information Details Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
              <div style={{ flex: 1.5, padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '300px' }}>RICE Information Section</div>
              <div style={{ flex: 1, padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px' }}>Object Type (RICEW)</div>
              <div style={{ flex: 1, padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '200px' }}>Complexity </div>
            </div>

            {/* RICE Information Details Row */}
            <div style={{ display: 'flex', backgroundColor: '#ffffff', borderBottom: '1px solid #ddd' }}>
              <div style={{
                flex: 1.5,
                padding: '8px 16px',
                fontSize: '13px',
                color: '#333',
                borderRight: '1px solid #ddd',
                minWidth: '450px', // Increased minWidth to accommodate both search and info
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {/* Search Bar inside the cell */}
                {/* Display Area for ID and Name */}
                <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', whiteSpace: 'nowrap' }}>
                  {selectedLovItem ? (
                    <span style={{ fontWeight: '600', color: 'black' }}>
                      {DOMPurify.sanitize(selectedLovItem.riceId, { ALLOWED_TAGS: [] })} - {DOMPurify.sanitize(selectedLovItem.ricewName, { ALLOWED_TAGS: [] })}
                    </span>
                  ) : (
                    <span style={{ color: '#bbb' }}>Select a RICEW Object</span>
                  )}
                </div>

                {/* Error inline if any */}
                {fetchError && (
                  <div style={{ color: '#dc2626', fontSize: '11px', fontWeight: '500' }}>
                    {fetchError}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, padding: '12px 16px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px' }}>{DOMPurify.sanitize(dashboardData.riceInformation.objectType, { ALLOWED_TAGS: [] })}</div>
              <div style={{ flex: 1, padding: '12px 16px', fontSize: '13px', color: '#333', minWidth: '200px' }}>{DOMPurify.sanitize(dashboardData.riceInformation.complexity, { ALLOWED_TAGS: [] })}</div>
            </div>



            {/* Empty space before next table */}
            <div style={{ height: '24px', backgroundColor: '#f8f9fa' }}></div>

            {/* RICE Document Group Header */}
            <div style={{ display: 'flex', backgroundColor: '#fff' }}>
              <div style={{
                padding: '16px 16px',
                fontWeight: 'bold',
                fontSize: '15px',
                color: 'black',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #ddd',
                borderBottom: '1px solid #ddd',
                width: '100%',
                flex: '1'
              }}>
                RICE Document Section
              </div>
            </div>

            {/* Table Header Row */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
              <div style={{ flex: 1.5, padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '300px' }}>Step</div>
              <div style={{ flex: 1.5, padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '300px' }}>Status</div>
              <div style={{ flex: 0.8, padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px' }}>Date</div>
              <div style={{ flex: 1, padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px' }}>Action</div>
              <div style={{ flex: 1, padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '200px' }}>Total Time Elapsed</div>
            </div>

            {/* Table Body Rows */}
            {isTimelineLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
                <div style={{ color: '#666', fontSize: '14px' }}>Loading timeline details...</div>
              </div>
            ) : dashboardData.riceDocuments.length > 0 ? (
              dashboardData.riceDocuments.map((item, index) => {
                const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                const fontWeight = item.isTotal ? 'bold' : '500';
                const textColor = item.isTotal ? '#111' : '#333';

                return (
                  <div key={item.id} style={{ display: 'flex', backgroundColor: item.isTotal ? '#e2e8f0' : rowBgColor, borderBottom: '1px solid #ddd' }}>
                    <div style={{ flex: 1.5, padding: '12px 16px', fontSize: '13px', color: textColor, borderRight: '1px solid #ddd', minWidth: '300px', fontWeight: fontWeight }}>
                      {DOMPurify.sanitize(item.step, { ALLOWED_TAGS: [] })}
                    </div>
                    <div style={{ flex: 1.5, padding: '12px 16px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '300px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: item.status === 'Pending' ? '#f3f4f6' : (item.status === 'Submitted' || item.status === 'Approved' || item.status === 'Assigned' || item.status === 'In Progress' || item.status === 'Complete') ? '#dcfce7' : '#f3f4f6',
                        color: item.status === 'Pending' ? '#6b7280' : (item.status === 'Submitted' || item.status === 'Approved' || item.status === 'Assigned' || item.status === 'In Progress' || item.status === 'Complete') ? '#166534' : '#6b7280',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {DOMPurify.sanitize(item.status, { ALLOWED_TAGS: [] })}
                      </span>
                    </div>
                    <div style={{ flex: 0.8, padding: '12px 16px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px' }}>
                      {DOMPurify.sanitize(item.date, { ALLOWED_TAGS: [] })}
                    </div>
                    <div style={{ flex: 1, padding: '12px 16px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px' }}>
                      {DOMPurify.sanitize(item.action, { ALLOWED_TAGS: [] })}
                    </div>
                    <div style={{ flex: 1, padding: '12px 16px', fontSize: '13px', color: textColor, minWidth: '200px', fontWeight: fontWeight }}>
                      {DOMPurify.sanitize(item.elapsedDays, { ALLOWED_TAGS: [] })}
                    </div>
                  </div>
                );
              })
            ) : selectedLovItem ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
                <div style={{ color: '#999', fontSize: '14px' }}>No timeline data available for this object.</div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
                <div style={{ color: '#bbb', fontSize: '14px' }}>Please select a RICEW ID to view progress timeline.</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .help-modal-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .help-modal-scroll::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px 0;
        }
        .help-modal-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default RICEWProgressDashboard;
