import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { getIdToken } from '../utils/cognito-auth';
import { HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSession } from '../context/SessionContext';

const RiceDocumentDashboard = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
  const { logout } = useSession();
  const handleAuthError = useCallback(() => {
    logout();
  }, [logout]);

  const [searchRiceId, setSearchRiceId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const [allRiceItems, setAllRiceItems] = useState([]);
  const [documentsData, setDocumentsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // Fetch LOV data
  useEffect(() => {
    const fetchLovData = async () => {
      try {
        setIsLoading(true);
        setFetchError('');
        const projectId = selectedProject?.id || '';
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

        const endpoint = `https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/RICEW/DocumnetDashboard/requestForm/lov?Project_id=${projectId}`;
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
            ricewRequestFormId: item.RICEWRequestFormId || ''
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

  // Fetch documents when a RICE item is selected
  useEffect(() => {
    const selectedItem = allRiceItems.find(item => item.riceId === searchRiceId);
    if (!selectedItem || !selectedItem.ricewRequestFormId) {
      setDocumentsData([]);
      return;
    }
    const fetchDocuments = async () => {
      try {
        setIsDocsLoading(true);
        const projectId = selectedProject?.id || '';

        const idToken = await getIdToken();
        if (!idToken) {
          handleAuthError();
          return;
        }

        const docsEndpoint = `https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/RICEW/DocumnetDashboard/functionalTestingInitiateWork/documents?RICEWRequestFormId=${selectedItem.ricewRequestFormId}&Project_id=${projectId}`;
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const docsResponse = await fetch(docsEndpoint, { headers });
        if (!docsResponse.ok) {
          if (docsResponse.status === 401 || docsResponse.status === 403) {
            handleAuthError();
            return;
          }
          setDocumentsData([]);
          return;
        }

        const docsResult = await docsResponse.json();
        if (docsResult.success && docsResult.data) {
          const sanitizedData = docsResult.data.map(doc => ({
            ...doc,
            'File Name': DOMPurify.sanitize(doc['File Name'] || '', { ALLOWED_TAGS: [] }),
            IC_full_name: DOMPurify.sanitize(doc.IC_full_name || '', { ALLOWED_TAGS: [] }),
            IC_email: DOMPurify.sanitize(doc.IC_email || '', { ALLOWED_TAGS: [] }),
            URL: DOMPurify.sanitize(doc.URL || '', { ALLOWED_TAGS: [] })
          }));
          setDocumentsData(sanitizedData);
        } else {
          setDocumentsData([]);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
        setDocumentsData([]);
      } finally {
        setIsDocsLoading(false);
      }
    };
    fetchDocuments();
  }, [searchRiceId, allRiceItems, handleAuthError]);

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
  };

  const handleClear = () => {
    setSearchRiceId('');
    setShowDropdown(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const getFileViewUrl = (url, fileName) => {
    if (!url || url === '-' || !url.startsWith('http')) return url;
    const extension = (fileName || url.split('?')[0]).split('.').pop().toLowerCase();
    if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
      return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    }
    return encodeURI(url);
  };

  const categories = [
    'Functional Specification Writing',
    'Technical Specification Writing',
    'Code Development',
    'Functional Testing'
  ];

  const selectedLovItem = allRiceItems.find(item => item.riceId === searchRiceId);

  return (
    <div className="config-main" style={{
      minHeight: '80vh',
      width: 'calc(98% - 2rem)',
      margin: '2rem auto',
      marginLeft: '2rem',
      marginRight: '2rem',
      paddingBottom: '40px',
      overflowY: 'visible'
    }}>
      <div className="dashboard-content" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0' }}>

        {/* Project Info */}
        <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
              Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span>
            </h3>
          </div>
        </div>

        {/* Page Title */}
        <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>RICEW Document Dashboard</h2>
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

        {/* Search Bar Section */}
        <div style={{
          padding: '1rem 1rem 1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          backgroundColor: 'white',
          borderTop: '1px solid #f0f0f0'
        }}>
          <span style={{ fontSize: '14px', color: '#555', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Select RICEW ID:
          </span>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              {/* Search icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: '10px', color: '#666', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder={isLoading ? 'Loading...' : 'Search by RICEW ID or Name'}
                value={searchRiceId}
                disabled={isLoading}
                onChange={e => { setSearchRiceId(e.target.value); setShowDropdown(true); }}
                onClick={() => setShowDropdown(true)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                style={{
                  padding: '8px 32px 8px 32px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  width: '280px',
                  outline: 'none',
                  backgroundColor: isLoading ? '#f5f5f5' : '#fff',
                  cursor: isLoading ? 'not-allowed' : 'text'
                }}
              />
              {searchRiceId && (
                <button
                  onClick={handleClear}
                  style={{
                    position: 'absolute', right: '8px',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#999',
                    fontSize: '14px', lineHeight: 1,
                    padding: '0', display: 'flex', alignItems: 'center'
                  }}
                  title="Clear"
                >✕</button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && !isLoading && (
              <div style={{
                position: 'absolute',
                top: '100%', left: 0,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderTop: 'none',
                borderRadius: '0 0 4px 4px',
                maxHeight: '220px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                width: '280px'
              }}>
                {fetchError && (
                  <div style={{ padding: '10px 12px', fontSize: '13px', color: '#dc2626' }}>{fetchError}</div>
                )}
                {!fetchError && filteredLovItems.length === 0 && (
                  <div style={{ padding: '10px 12px', fontSize: '13px', color: '#888', fontStyle: 'italic' }}>No items found.</div>
                )}
                {!fetchError && filteredLovItems.map((item, idx) => (
                  <div
                    key={item.riceId}
                    onMouseDown={() => handleSelectItem(item)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom: idx < filteredLovItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#333' }}>{DOMPurify.sanitize(item.riceId, { ALLOWED_TAGS: [] })}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{DOMPurify.sanitize(item.ricewName, { ALLOWED_TAGS: [] })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error inline */}
          {fetchError && (
            <div style={{
              color: '#dc2626', fontSize: '14px', fontWeight: '500',
              padding: '8px 12px', backgroundColor: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: '4px'
            }}>
              {fetchError}
            </div>
          )}
        </div>

        {/* Table Container */}
        <div style={{ backgroundColor: '#fff', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ minWidth: '800px', boxSizing: 'border-box', padding: '0 2rem' }}>

            {/* Selected Item Box */}
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: '#fdfdfd' }}>
                <div style={{ width: '160px', flex: '0 0 160px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>RICEW ID</div>
                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px' }}>RICEW Name</div>
                <div style={{ flex: 2, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '300px' }}>RICEW Description</div>
              </div>
              <div style={{ display: 'flex', backgroundColor: '#fff' }}>
                <div style={{ width: '160px', flex: '0 0 160px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
                  {selectedLovItem ? DOMPurify.sanitize(selectedLovItem.riceId, { ALLOWED_TAGS: [] }) : <span style={{ color: '#bbb' }}>—</span>}
                </div>
                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px' }}>
                  {selectedLovItem ? DOMPurify.sanitize(selectedLovItem.ricewName, { ALLOWED_TAGS: [] }) : <span style={{ color: '#bbb' }}>—</span>}
                </div>
                <div style={{ flex: 2, padding: '12px 12px', fontSize: '13px', color: '#333', minWidth: '300px' }}>
                  {selectedLovItem ? (DOMPurify.sanitize(selectedLovItem.ricewDescription || '', { ALLOWED_TAGS: [] }) || '—') : <span style={{ color: '#bbb' }}>—</span>}
                </div>
              </div>
            </div>

            {/* Loading / Empty State */}
            {isLoading && (
              <div style={{ padding: '30px', textAlign: 'center', color: '#666', fontSize: '14px', backgroundColor: '#fff' }}>
                Loading RICEW items...
              </div>
            )}
            {!isLoading && !selectedLovItem && (
              <div style={{ padding: '30px', textAlign: 'center', color: '#999', fontSize: '14px', backgroundColor: '#fff' }}>
                Select a RICEW ID from the dropdown above to view its documents.
              </div>
            )}
            {isDocsLoading && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '14px', backgroundColor: '#fff' }}>
                Loading documents...
              </div>
            )}

            {/* Category Sections Container */}
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fff' }}>
              {selectedLovItem && !isDocsLoading && categories.map((category, index) => {
                const formId = selectedLovItem.ricewRequestFormId;

                // Map UI categories to backend SourceTable labels
                const categoryMapper = {
                  'Functional Specification Writing': 'Functional_Specification',
                  'Technical Specification Writing': 'Technical_Specification',
                  'Code Development': 'Code_Development',
                  'Functional Testing': 'Functional_Testing'
                };
                const sourceLabel = categoryMapper[category];

                const matchedDocs = sourceLabel
                  ? documentsData.filter(doc => doc.SourceTable === sourceLabel)
                  : [];

                return (
                  <React.Fragment key={category}>
                    {/* Category Header */}
                    <div style={{
                      display: 'flex',
                      borderBottom: index < categories.length - 1 ? '1px solid #ddd' : 'none',
                      borderTop: index > 0 ? '1px solid #ddd' : 'none',
                      backgroundColor: '#f8f9fa'
                    }}>
                      <div style={{
                        width: '160px', flex: '0 0 160px',
                        padding: '10px 12px',
                        fontWeight: 'bold', fontSize: '13px', color: '#333',
                        borderRight: '1px solid #ddd',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {category}
                      </div>
                      <div style={{
                        flex: 1, padding: '0',
                        display: 'flex', flexDirection: 'column'
                      }}>
                        {/* Sub-header */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
                          <div style={{ flex: 3, padding: '8px 12px', fontSize: '13px', fontWeight: 'bold', color: '#555', borderRight: '1px solid #ddd' }}>File Name</div>
                          <div style={{ flex: 1, minWidth: '180px', padding: '8px 12px', fontSize: '13px', fontWeight: 'bold', color: '#555', borderRight: '1px solid #ddd' }}>Employee Name</div>
                          <div style={{ flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Employee Email</div>
                        </div>

                        {/* Document rows */}
                        {matchedDocs.length === 0 ? (
                          <div style={{ display: 'flex', backgroundColor: '#fff' }}>
                            <div style={{ flex: 3, padding: '10px 12px', fontSize: '13px', color: '#aaa', fontStyle: 'italic', borderRight: '1px solid #ddd' }}>No approved documents found</div>
                            <div style={{ flex: 1, minWidth: '180px', padding: '10px 12px', fontSize: '13px', color: '#aaa', borderRight: '1px solid #ddd' }}>—</div>
                            <div style={{ flex: 1, minWidth: '200px', padding: '10px 12px', fontSize: '13px', color: '#aaa' }}>—</div>
                          </div>
                        ) : (
                          matchedDocs.map((doc, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa',
                                borderTop: idx > 0 ? '1px solid #eee' : 'none'
                              }}
                            >
                              <div style={{ flex: 3, padding: '10px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
                                <a
                                  href={getFileViewUrl(doc.URL, doc['File Name'])}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    fontWeight: '500',
                                    fontSize: '13px'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                >
                                  {DOMPurify.sanitize(doc['File Name'] || 'Untitled', { ALLOWED_TAGS: [] })}
                                </a>
                              </div>
                              <div style={{ flex: 1, minWidth: '180px', padding: '10px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
                                {DOMPurify.sanitize(doc.IC_full_name || 'Not Assigned', { ALLOWED_TAGS: [] })}
                              </div>
                              <div style={{ flex: 1, minWidth: '200px', padding: '10px 12px', fontSize: '13px', color: '#333' }}>
                                {DOMPurify.sanitize(doc.IC_email || '—', { ALLOWED_TAGS: [] })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

          </div>
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
                    The <strong>RICEW Document Dashboard</strong> provides a centralised view of all approved documents associated with a specific RICEW request. It groups documents by delivery phase so stakeholders can quickly locate the right artefact for each RICEW object.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    ERP technical objects go through multiple delivery phases — specification, development, and testing. This dashboard gives project managers and business owners a single place to review all approved deliverables for any RICEW item, without navigating through individual task records.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                  <ol style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Use the <strong>Select RICEW ID</strong> search box to find a RICEW request by its ID or name.</li>
                    <li>Select an item from the dropdown — its ID, name, and description will appear in the panel below the search bar.</li>
                    <li>The document table will automatically load all approved documents for that RICEW, grouped by delivery category.</li>
                    <li>Click any <strong>File Name</strong> link (shown in blue) to open or preview the document.</li>
                  </ol>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Document categories</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Functional Specification Writing</strong> — Approved functional specification documents for the RICEW object.</li>
                    <li><strong>Technical Specification Writing</strong> — Approved technical design and specification documents.</li>
                    <li><strong>Code Development</strong> — Approved code or build artefacts submitted during development.</li>
                    <li><strong>Functional Testing</strong> — Approved test results, scripts, or sign-off documents from functional testing.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Only <strong>approved</strong> documents are shown — documents pending review will not appear here.</li>
                    <li>A project must be selected before RICEW items can be loaded in the search dropdown.</li>
                    <li>If a category shows <em>No approved documents found</em>, no document has been approved for that phase yet.</li>
                    <li>Office files (Excel, Word) open via Microsoft Office Online viewer; other file types open directly.</li>
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
  );
};

export default RiceDocumentDashboard;
