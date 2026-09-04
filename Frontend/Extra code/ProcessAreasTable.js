import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import DOMPurify from 'dompurify';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';

const ProcessAreasTable = ({ onClose, selectedProject }) => {
  const { handleAuthError } = useSession();
  const { getCachedToken } = useAuth();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedL1, setExpandedL1] = useState({});
  const [expandedL2, setExpandedL2] = useState({});
  const [expandedL3, setExpandedL3] = useState({});
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
      stream_name: DOMPurify.sanitize(String(item.app_name || '').trim(), sanitizeConfig),
      process_name: DOMPurify.sanitize(String(item.l0_name || '').trim(), sanitizeConfig),
      description: DOMPurify.sanitize(String(item.l0_desc || '').trim(), sanitizeConfig),
      l0_id: item.l0_id || null
    }));
  };

  const fetchProcessAreasL0 = async () => {
    // Get Cognito ID token
    const idToken = await getCachedToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found - please login again');
    }

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch(GLOBAL_SETUP_API_CONFIG.PROCESS_AREAS_L0_API_URL, {
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthError('Unauthorized - session expired');
      throw new Error('Unauthorized - session expired');
    }

    if (response.ok) {
      const result = await response.json();
      const processArray = Array.isArray(result) ? result : (result.data || []);
      const sortedData = processArray.sort((a, b) => {
        const aNum = parseInt((a.application_id || '').replace(/\D/g, '')) || 0;
        const bNum = parseInt((b.application_id || '').replace(/\D/g, '')) || 0;
        return aNum - bNum;
      });
      return validateAndSanitizeData(sortedData);
    }
    throw new Error('Failed to fetch data');
  };

  const { data: processAreasData = [], isLoading: loading } = useQuery({
    queryKey: ['processAreasL0', selectedProject?.id || 'all'],
    queryFn: fetchProcessAreasL0,
    enabled: !!selectedProject,
  });

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

  const fetchHierarchyData = async ({ signal }) => {
    const batchEndpoints = GLOBAL_SETUP_API_CONFIG.HIERARCHY_BATCH_API_URLS;

    try {
      // Get Cognito ID token
      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        return;
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      // Fetch all batches in parallel with authentication
      const responses = await Promise.all(
        batchEndpoints.map(url =>
          fetch(url, { headers: headers, signal: signal }).then(async res => {
            if (res.status === 401 || res.status === 403) {
              throw new Error('Unauthorized - session expired');
            }
            if (res.ok) {
              const result = await res.json();
              return Array.isArray(result) ? result : (result.data || []);
            }
            return [];
          })
        )
      );

      // Combine all batch responses
      const allData = responses.flat();
      console.log('All hierarchy data loaded:', allData.length, 'items');

      // Group data by l0_id
      const groupedByL0 = {};

      allData.forEach(item => {
        let l0_id = null;

        // Extract l0_id from the nested structure
        if (item.l0_id) {
          // Direct L0 item
          l0_id = item.l0_id;
        } else if (item.l1_process?.l0_process?.l0_id) {
          // L2 item
          l0_id = item.l1_process.l0_process.l0_id;
        } else if (item.l2_process?.l1_process?.l0_process?.l0_id) {
          // L3 item
          l0_id = item.l2_process.l1_process.l0_process.l0_id;
        } else if (item.l3_process?.l2_process?.l1_process?.l0_process?.l0_id) {
          // L4 item
          l0_id = item.l3_process.l2_process.l1_process.l0_process.l0_id;
        }

        if (l0_id) {
          if (!groupedByL0[l0_id]) {
            groupedByL0[l0_id] = [];
          }
          groupedByL0[l0_id].push(item);
        }
      });

      // Transform each L0 group into hierarchical structure
      const transformedHierarchy = {};
      Object.keys(groupedByL0).forEach(l0_id => {
        const transformed = transformHierarchyData(groupedByL0[l0_id]);
        // Sort L1 items by l1_id to ensure correct order across batches
        transformed.sort((a, b) => {
          const aNum = parseInt(a.l1_id.replace('l1_', ''));
          const bNum = parseInt(b.l1_id.replace('l1_', ''));
          return aNum - bNum;
        });
        transformedHierarchy[l0_id] = transformed;
      });

      return transformedHierarchy;
    } catch (error) {
      if (error.name === 'AbortError') return {};
      console.error('Error loading hierarchy data:', error);
      handleAuthError(error.message);
      throw error;
    }
  };

  // Transform flat API data into hierarchical structure
  function transformHierarchyData(apiData) {
    const l1Map = {};

    // Group by L1 -> L2 -> L3 -> L4
    apiData.forEach(item => {
      // Handle L4 items (with l3_process)
      if (item.l4_id && item.l3_process) {
        const l3Process = item.l3_process;
        const l2Process = l3Process.l2_process;
        const l1Process = l2Process?.l1_process;

        if (!l1Process) return;

        const l1Id = l1Process.l1_id;
        const l2Id = l2Process.l2_id;
        const l3Id = l3Process.l3_id;

        // Initialize L1
        if (!l1Map[l1Id]) {
          l1Map[l1Id] = {
            l1_id: l1Id,
            l1_name: l1Process.l1_name,
            l2_items: {}
          };
        }

        // Initialize L2
        if (!l1Map[l1Id].l2_items[l2Id]) {
          l1Map[l1Id].l2_items[l2Id] = {
            l2_id: l2Id,
            l2_name: l2Process.l2_name,
            l3_items: {}
          };
        }

        // Initialize L3
        if (!l1Map[l1Id].l2_items[l2Id].l3_items[l3Id]) {
          l1Map[l1Id].l2_items[l2Id].l3_items[l3Id] = {
            l3_id: l3Id,
            l3_name: l3Process.l3_name,
            l4_items: []
          };
        }

        // Add L4
        l1Map[l1Id].l2_items[l2Id].l3_items[l3Id].l4_items.push({
          l4_id: item.l4_id,
          l4_name: item.l4_name
        });
      }
      // Handle L3 items (with l2_process)
      else if (item.l3_id && item.l2_process) {
        const l2Process = item.l2_process;
        const l1Process = l2Process.l1_process;

        if (!l1Process) return;

        const l1Id = l1Process.l1_id;
        const l2Id = l2Process.l2_id;
        const l3Id = item.l3_id;

        // Initialize L1
        if (!l1Map[l1Id]) {
          l1Map[l1Id] = {
            l1_id: l1Id,
            l1_name: l1Process.l1_name,
            l2_items: {}
          };
        }

        // Initialize L2
        if (!l1Map[l1Id].l2_items[l2Id]) {
          l1Map[l1Id].l2_items[l2Id] = {
            l2_id: l2Id,
            l2_name: l2Process.l2_name,
            l3_items: {}
          };
        }

        // Initialize L3 (if not already exists)
        if (!l1Map[l1Id].l2_items[l2Id].l3_items[l3Id]) {
          l1Map[l1Id].l2_items[l2Id].l3_items[l3Id] = {
            l3_id: l3Id,
            l3_name: item.l3_name,
            l4_items: []
          };
        }
      }
      // Handle L2 items (with l1_process)
      else if (item.l2_id && item.l1_process) {
        const l1Process = item.l1_process;
        const l1Id = l1Process.l1_id;
        const l2Id = item.l2_id;

        // Initialize L1
        if (!l1Map[l1Id]) {
          l1Map[l1Id] = {
            l1_id: l1Id,
            l1_name: l1Process.l1_name,
            l2_items: {}
          };
        }

        // Initialize L2 (if not already exists)
        if (!l1Map[l1Id].l2_items[l2Id]) {
          l1Map[l1Id].l2_items[l2Id] = {
            l2_id: l2Id,
            l2_name: item.l2_name,
            l3_items: {}
          };
        }
      }
      // Handle L1 items (with l0_process)
      else if (item.l1_id && item.l0_process) {
        const l1Id = item.l1_id;

        // Initialize L1 (if not already exists)
        if (!l1Map[l1Id]) {
          l1Map[l1Id] = {
            l1_id: l1Id,
            l1_name: item.l1_name,
            l2_items: {}
          };
        }
      }
    });

    // Convert maps to arrays and sort by IDs
    return Object.values(l1Map).map(l1 => ({
      ...l1,
      l2_items: Object.values(l1.l2_items)
        .sort((a, b) => {
          const aNum = parseInt(a.l2_id.replace('l2_', ''));
          const bNum = parseInt(b.l2_id.replace('l2_', ''));
          return aNum - bNum;
        })
        .map(l2 => ({
          ...l2,
          l3_items: Object.values(l2.l3_items)
            .sort((a, b) => {
              const aNum = parseInt(a.l3_id.replace('l3_', ''));
              const bNum = parseInt(b.l3_id.replace('l3_', ''));
              return aNum - bNum;
            })
            .map(l3 => ({
              ...l3,
              l4_items: l3.l4_items.sort((a, b) => {
                const aNum = parseInt(a.l4_id.replace('l4_', ''));
                const bNum = parseInt(b.l4_id.replace('l4_', ''));
                return aNum - bNum;
              })
            }))
        }))
    }));
  };

  const { data: hierarchyData = {}, isLoading: loadingHierarchy } = useQuery({
    queryKey: ['processHierarchy'],
    queryFn: ({ signal }) => fetchHierarchyData({ signal }),
    staleTime: Infinity,
  });

  // Toggle expand/collapse for a specific row (L0 level)
  const toggleExpand = (index) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Toggle expand/collapse for L1 items
  const toggleL1 = (l0Index, l1Id) => {
    const key = `${l0Index}_${l1Id}`;
    setExpandedL1(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Toggle expand/collapse for L2 items
  const toggleL2 = (l0Index, l1Id, l2Id) => {
    const key = `${l0Index}_${l1Id}_${l2Id}`;
    setExpandedL2(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Toggle expand/collapse for L3 items
  const toggleL3 = (l0Index, l1Id, l2Id, l3Id) => {
    const key = `${l0Index}_${l1Id}_${l2Id}_${l3Id}`;
    setExpandedL3(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Processes Areas (L0 / L1 / L2 / L3...)</h2>
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
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#3b4b5e'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#4D5C74'}
          >
            <HelpCircle size={16} />
            Help
          </button>
          {showHelpPopup && (
            <div style={{
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
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
                width: '800px',
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
                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        The <strong>Process Areas</strong> page displays the comprehensive business process hierarchy for your project. It organizes processes into multiple levels, from high-level process areas (L0) down to granular sub-processes and tasks (L1, L2, L3...).
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Understanding the process hierarchy is critical for defining project scope and identifying business requirements. This structured view allows teams to drill down into specific functional areas to see how high-level business goals are broken down into actionable operational steps.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Stream Name</strong> — The high-level application or functional suite grouping.</li>
                        <li><strong>Process Name (L0)</strong> — The primary business process. Click the <strong>+</strong> button to expand and see nested sub-processes.</li>
                        <li><strong>Hierarchy Levels</strong> — Use the <strong>+</strong> / <strong>−</strong> buttons at each level (L1, L2, etc.) to navigate deeper into the process tree.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Key behaviors</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Data is fetched in optimized batches from the RICE hierarchy API to ensure fast loading times despite the complexity.</li>
                        <li>Blue-colored text indicates that a process area has deeper levels available to explore.</li>
                        <li>Ensure your session is active; otherwise, you may need to re-log to load all hierarchy levels.</li>
                        <li>The hierarchy supports multiple nested layers (up to L4) depending on the process definition.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Stream Name</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Process Name</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {processAreasData.length > 0 ? (
              processAreasData.map((item, index) => {
                const currentStreamName = item.stream_name || 'N/A';
                const previousStreamName = index > 0 ? (processAreasData[index - 1].stream_name || 'N/A') : null;
                const showStreamName = currentStreamName !== previousStreamName;

                // Check if this process has hierarchy data (only if data is loaded and exists)
                const hasHierarchy = !loadingHierarchy && item.l0_id && hierarchyData[item.l0_id] && hierarchyData[item.l0_id].length > 0;

                return (
                  <React.Fragment key={index}>
                    <tr style={{ height: '40px' }}>
                      <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                        {showStreamName ? currentStreamName : ''}
                      </td>
                      <td
                        style={{
                          padding: '6px 12px',
                          verticalAlign: 'middle',
                          color: hasHierarchy ? '#0073e6' : 'inherit',
                          fontWeight: hasHierarchy ? '500' : 'normal'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {hasHierarchy && (
                            <button
                              onClick={() => toggleExpand(index)}
                              style={{
                                background: 'none',
                                border: '1px solid #0073e6',
                                borderRadius: '3px',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#0073e6',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#0073e6';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#0073e6';
                              }}
                            >
                              {expandedRows[index] ? '−' : '+'}
                            </button>
                          )}
                          <span>{item.process_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td style={{
                        padding: '6px 12px',
                        verticalAlign: 'middle',
                        color: hasHierarchy ? '#0073e6' : 'inherit'
                      }}>
                        {item.description || 'N/A'}
                      </td>
                    </tr>

                    {/* Hierarchy directly below process if it exists and is expanded */}
                    {hasHierarchy && expandedRows[index] && hierarchyData[item.l0_id] && hierarchyData[item.l0_id].length > 0 && (
                      <tr>
                        <td colSpan="3" style={{ padding: '0', backgroundColor: '#f8f9fa' }}>
                          {/* Header to show process hierarchy */}
                          <div style={{
                            padding: '12px 40px',
                            backgroundColor: '#e8f4fd',
                            borderTop: '2px solid #0073e6',
                            borderBottom: '1px solid #d0e7f9',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#0073e6'
                            }}>
                              Process Hierarchy for: {
                                item.process_name === 'Hire-to-Retire' ? 'Acquire to Retire' :
                                  item.process_name === 'Talent Management' ? 'Hire to Retire (Employee Lifecycle Management)' :
                                    item.process_name === 'Risk Assessment' ? 'Govern to Comply (G2C)' :
                                      item.process_name === 'Plan-to-Produce' ? 'Design to Build (Manufacturing and Supply Chain)' :
                                        item.process_name
                              }
                            </span>
                          </div>
                          <div style={{ padding: '24px 40px 24px 60px' }}>
                            {(() => {
                              // Initialize counters outside L1 loop to maintain continuity across all L1 items
                              let l3Counter = 0;
                              let l4Counter = 0;

                              return hierarchyData[item.l0_id].map((l1Item, l1Index) => {
                                const l1Key = `${index}_${l1Item.l1_id}`;
                                const hasL2Items = Array.isArray(l1Item.l2_items) && l1Item.l2_items.length > 0;

                                return (
                                  <div key={l1Index} style={{ marginBottom: '28px' }}>
                                    {/* L1 Header - Clean Oracle Style */}
                                    <div style={{
                                      backgroundColor: '#ffffff',
                                      padding: '14px 20px',
                                      borderRadius: '4px',
                                      marginBottom: '16px',
                                      borderLeft: '4px solid #0073e6',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}>
                                      {hasL2Items && (
                                        <button
                                          onClick={() => toggleL1(index, l1Item.l1_id)}
                                          style={{
                                            background: 'none',
                                            border: '1px solid #0073e6',
                                            borderRadius: '3px',
                                            width: '20px',
                                            height: '20px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#0073e6',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            transition: 'all 0.2s ease',
                                            flexShrink: 0
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#0073e6';
                                            e.currentTarget.style.color = 'white';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = '#0073e6';
                                          }}
                                        >
                                          {expandedL1[l1Key] ? '−' : '+'}
                                        </button>
                                      )}
                                      <span style={{
                                        fontSize: '15px',
                                        color: '#0073e6',
                                        fontWeight: '600',
                                        letterSpacing: '0.3px'
                                      }}>
                                        {l1Index + 1}.
                                      </span>
                                      <span style={{
                                        fontSize: '15px',
                                        color: '#0073e6',
                                        fontWeight: '600',
                                        letterSpacing: '0.3px'
                                      }}>
                                        L1: {l1Index + 1}
                                      </span>
                                      <span style={{
                                        fontSize: '15px',
                                        color: '#333',
                                        fontWeight: '600',
                                        letterSpacing: '0.2px'
                                      }}>
                                        {l1Item.l1_name}
                                      </span>
                                    </div>

                                    {/* L2 Items */}
                                    {hasL2Items && expandedL1[l1Key] && (
                                      <div style={{ marginLeft: '30px' }}>
                                        {l1Item.l2_items.map((l2Item, l2Index) => {
                                          const l2Key = `${index}_${l1Item.l1_id}_${l2Item.l2_id}`;
                                          const hasL3Items = Array.isArray(l2Item.l3_items) && l2Item.l3_items.length > 0;

                                          return (
                                            <div key={l2Index} style={{ marginBottom: '20px' }}>
                                              {/* L2 Header - Clean Style */}
                                              <div style={{
                                                backgroundColor: '#ffffff',
                                                padding: '12px 18px',
                                                borderRadius: '3px',
                                                marginBottom: '12px',
                                                borderLeft: '3px solid #6b6b6b',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                              }}>
                                                {hasL3Items && (
                                                  <button
                                                    onClick={() => toggleL2(index, l1Item.l1_id, l2Item.l2_id)}
                                                    style={{
                                                      background: 'none',
                                                      border: '1px solid #6b6b6b',
                                                      borderRadius: '3px',
                                                      width: '18px',
                                                      height: '18px',
                                                      cursor: 'pointer',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      color: '#6b6b6b',
                                                      fontSize: '12px',
                                                      fontWeight: 'bold',
                                                      transition: 'all 0.2s ease',
                                                      flexShrink: 0
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.backgroundColor = '#6b6b6b';
                                                      e.currentTarget.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.backgroundColor = 'transparent';
                                                      e.currentTarget.style.color = '#6b6b6b';
                                                    }}
                                                  >
                                                    {expandedL2[l2Key] ? '−' : '+'}
                                                  </button>
                                                )}
                                                <span style={{
                                                  fontSize: '14px',
                                                  color: '#6b6b6b',
                                                  fontWeight: '600'
                                                }}>
                                                  ({String.fromCharCode(97 + l2Index)})
                                                </span>
                                                <span style={{
                                                  fontSize: '14px',
                                                  color: '#6b6b6b',
                                                  fontWeight: '600'
                                                }}>
                                                  L2.1:
                                                </span>
                                                <span style={{
                                                  fontSize: '14px',
                                                  color: '#444',
                                                  fontWeight: '500'
                                                }}>
                                                  {l2Item.l2_name}
                                                </span>
                                              </div>

                                              {/* L3 Items - Clean List Style */}
                                              {hasL3Items && expandedL2[l2Key] && (
                                                <div style={{ marginLeft: '30px' }}>
                                                  {l2Item.l3_items.map((l3Item, l3Index) => {
                                                    l3Counter++;
                                                    const currentL3Number = l3Counter;
                                                    const l3Key = `${index}_${l1Item.l1_id}_${l2Item.l2_id}_${l3Item.l3_id}`;
                                                    const hasL4Items = Array.isArray(l3Item.l4_items) && l3Item.l4_items.length > 0;

                                                    return (
                                                      <div key={l3Index} style={{ marginBottom: '12px' }}>
                                                        <div
                                                          style={{
                                                            padding: '10px 16px',
                                                            marginBottom: '8px',
                                                            backgroundColor: '#ffffff',
                                                            borderRadius: '3px',
                                                            fontSize: '13px',
                                                            color: '#555',
                                                            borderLeft: '2px solid #d0d0d0',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            transition: 'all 0.2s ease'
                                                          }}
                                                          onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                            e.currentTarget.style.borderLeftColor = '#999';
                                                          }}
                                                          onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#ffffff';
                                                            e.currentTarget.style.borderLeftColor = '#d0d0d0';
                                                          }}
                                                        >
                                                          {hasL4Items && (
                                                            <button
                                                              onClick={() => toggleL3(index, l1Item.l1_id, l2Item.l2_id, l3Item.l3_id)}
                                                              style={{
                                                                background: 'none',
                                                                border: '1px solid #888',
                                                                borderRadius: '2px',
                                                                width: '16px',
                                                                height: '16px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#888',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold',
                                                                transition: 'all 0.2s ease',
                                                                flexShrink: 0
                                                              }}
                                                              onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = '#888';
                                                                e.currentTarget.style.color = 'white';
                                                              }}
                                                              onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                e.currentTarget.style.color = '#888';
                                                              }}
                                                            >
                                                              {expandedL3[l3Key] ? '−' : '+'}
                                                            </button>
                                                          )}
                                                          <span style={{
                                                            fontSize: '13px',
                                                            color: '#888',
                                                            fontStyle: 'italic',
                                                            minWidth: '50px'
                                                          }}>
                                                            {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][l3Index] || `${l3Index + 1}`}.
                                                          </span>
                                                          <span style={{
                                                            fontSize: '13px',
                                                            color: '#888',
                                                            fontWeight: '600'
                                                          }}>
                                                            L3.{currentL3Number}:
                                                          </span>
                                                          <span style={{
                                                            fontSize: '13px',
                                                            color: '#555'
                                                          }}>
                                                            {l3Item.l3_name}
                                                          </span>
                                                        </div>

                                                        {/* L4 Items */}
                                                        {hasL4Items && expandedL3[l3Key] && (
                                                          <div style={{ marginLeft: '30px' }}>
                                                            {l3Item.l4_items.map((l4Item, l4Index) => {
                                                              l4Counter++;
                                                              const currentL4Number = l4Counter;

                                                              return (
                                                                <div
                                                                  key={l4Index}
                                                                  style={{
                                                                    padding: '8px 14px',
                                                                    marginBottom: '6px',
                                                                    backgroundColor: '#f9f9f9',
                                                                    borderRadius: '3px',
                                                                    fontSize: '12px',
                                                                    color: '#666',
                                                                    borderLeft: '2px solid #e0e0e0',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                  }}
                                                                >
                                                                  <span style={{
                                                                    fontSize: '12px',
                                                                    color: '#999',
                                                                    marginRight: '8px',
                                                                    minWidth: '30px'
                                                                  }}>
                                                                    {String.fromCharCode(65 + l4Index)}.
                                                                  </span>
                                                                  <span style={{
                                                                    fontSize: '12px',
                                                                    color: '#999',
                                                                    fontWeight: '600',
                                                                    marginRight: '8px'
                                                                  }}>
                                                                    L4.{currentL4Number}:
                                                                  </span>
                                                                  <span style={{
                                                                    fontSize: '12px',
                                                                    color: '#666'
                                                                  }}>
                                                                    {l4Item.l4_name}
                                                                  </span>
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No process areas data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      {/* Standardized Loading Overlay */}
      <Loader loading={loading} />


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
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <SessionExpiredPopup />
    </div>
  );
};

export default ProcessAreasTable;
