import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X, Filter } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';

const IndustriesTable = ({ onClose, selectedProject }) => {
  const { handleAuthError } = useSession();
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  const helpPopupRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map((item, index) => ({
      id: index + 1,
      listOfIndustriesId: item.list_Of_Industries_id?.S || item.list_Of_Industries_id || '',
      industryId: DOMPurify.sanitize(String(item.INDUSTRY_DISPLAY_ID || item.Industry_Id?.S || item.Industry_Id || '').trim(), sanitizeConfig),
      industryCode: DOMPurify.sanitize(String(item.INDUSTRY_CODE || item.Industry_Code?.S || item.Industry_Code || '').trim(), sanitizeConfig),
      industryName: DOMPurify.sanitize(String(item.INDUSTRY_NAME || item.Industry_Name?.S || item.Industry_Name || '').trim(), sanitizeConfig),
      sectorId: DOMPurify.sanitize(String(item.SECTOR_DISPLAY_ID || item.Sector_Id?.S || item.Sector_Id || '').trim(), sanitizeConfig),
      sectorCode: DOMPurify.sanitize(String(item.SECTOR_CODE || item.Sector_Code?.S || item.Sector_Code || '').trim(), sanitizeConfig),
      sectorName: DOMPurify.sanitize(String(item.SECTOR_NAME || item.Sector_Name?.S || item.Sector_Name || '').trim(), sanitizeConfig),
      subSectorId: DOMPurify.sanitize(String(item.SUB_SECTOR_DISPLAY_ID || item.Subsector_Id?.S || item.Subsector_Id || '').trim(), sanitizeConfig),
      subSectorCode: DOMPurify.sanitize(String(item.SUB_SECTOR_CODE || item.Subsector_Code?.S || item.Subsector_Code || '').trim(), sanitizeConfig),
      subSectorName: DOMPurify.sanitize(String(item.SUB_SECTOR_NAME || item.Subsector_Name?.S || item.Subsector_Name || '').trim(), sanitizeConfig),
    }));
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (helpPopupRef.current && !helpPopupRef.current.contains(event.target)) {
        setShowHelpPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchIndustriesData = async () => {
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch(GLOBAL_SETUP_API_CONFIG.INDUSTRIES_API_URL, {
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthError('Unauthorized - session expired');
      throw new Error('Unauthorized');
    }

    if (response.ok) {
      const result = await response.json();
      const industriesArray = Array.isArray(result) ? result : (result.data || []);

      const activeRecords = industriesArray.filter(item => {
        const deleteStatus = item.delete_status?.S || item.delete_status;
        return deleteStatus !== "true" && deleteStatus !== true;
      });

      const sanitizedData = validateAndSanitizeData(activeRecords);
      sanitizedData.sort((a, b) => {
        const idA = parseInt(a.listOfIndustriesId) || 0;
        const idB = parseInt(b.listOfIndustriesId) || 0;
        return idA - idB;
      });
      return sanitizedData;
    }

    throw new Error('Failed to fetch industries data');
  };

  const { data: industriesData = [], isLoading: loading, isError, error } = useQuery({
    queryKey: ['industriesList'],
    queryFn: fetchIndustriesData
  });

  const industryOptions = [...new Set(industriesData.map(item => item.industryName).filter(Boolean))].sort();

  const filteredData = selectedIndustry
    ? industriesData.filter(item => item.industryName === selectedIndustry)
    : industriesData;

  const handleIndustryFilterChange = (value) => {
    setSelectedIndustry(value);
  };

  return (
    <div className="config-main" style={{ margin: '2rem', paddingBottom: '1rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>

      <div className="config-header" style={{ marginTop: '-4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '27px' }}>
          <h2 style={{ margin: 0, color: '#333', lineHeight: '1' }}>Global Industries List</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="#6b7280" />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#4b5563' }}>Filter by Industry:</span>
            </div>

            <div style={{ position: 'relative', width: '250px' }} ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
                  fontSize: '14px', color: selectedIndustry ? '#333' : '#999', backgroundColor: 'white',
                  cursor: 'pointer', outline: 'none', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <span>{selectedIndustry || 'All Industries'}</span>
                <span style={{ fontSize: '12px', color: '#999' }}>▼</span>
              </button>

              {isFilterDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000, maxHeight: '300px',
                  overflowY: 'auto', marginTop: '6px'
                }}>
                  <div
                    onClick={() => { handleIndustryFilterChange(''); setIsFilterDropdownOpen(false); }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer', backgroundColor: selectedIndustry === '' ? '#f0f9ff' : 'white',
                      color: '#333', fontSize: '14px', borderBottom: '1px solid #f0f0f0'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedIndustry === '' ? '#f0f9ff' : 'white'}
                  >
                    All Industries
                  </div>
                  {industryOptions.map((industry, index) => (
                    <div
                      key={index}
                      onClick={() => { handleIndustryFilterChange(industry); setIsFilterDropdownOpen(false); }}
                      style={{
                        padding: '10px 12px', cursor: 'pointer', backgroundColor: selectedIndustry === industry ? '#f0f9ff' : 'white',
                        color: '#333', fontSize: '14px', borderBottom: '1px solid #f0f0f0'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedIndustry === industry ? '#f0f9ff' : 'white'}
                    >
                      {industry}
                    </div>
                  ))}
                </div>
              )}

              {/* {selectedIndustry && (
                <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: '2px', fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  Showing {filteredData.length} {filteredData.length === 1 ? 'industry' : 'industries'} for "{selectedIndustry}"
                </div>
              )} */}
            </div>

            {selectedIndustry && (
              <button
                onClick={() => handleIndustryFilterChange('')}
                style={{
                  padding: '8px 16px', backgroundColor: '#dc3545', border: 'none', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px', color: 'white', transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#c82333'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = '#dc3545'; }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Help Button */}
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
                top: '0', left: '0', right: '0', bottom: '0',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 3000, padding: '20px'
              }}>
                <div
                  ref={helpPopupRef}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                    width: '100%', maxWidth: '800px', maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column', position: 'relative'
                  }}
                >
                  <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', textAlign: 'left', flex: '1' }}>
                    <button
                      onClick={() => setShowHelpPopup(false)}
                      style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
                    >
                      <X size={20} />
                    </button>
                    <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
                      Help & Information
                    </h3>
                    <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                      <div style={{ marginBottom: '14px' }}>
                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                        <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                          The <strong>Global Industries List</strong> manages a standardized hierarchy of industries, sectors, and sub-sectors.
                        </p>
                      </div>
                      <div style={{ marginBottom: '14px' }}>
                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                        <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                          Maintaining a consistent industry taxonomy ensures accurate market segmentation, reporting, and customer classification across the system.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isError && (
        <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', marginTop: '16px' }}>
          <span style={{ fontWeight: '500' }}>{error.message || 'Failed to load data'}</span>
        </div>
      )}

      <Loader loading={loading} />

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 292px)', overflowY: 'auto', marginTop: '16px' }}>
        <table className="config-table" style={{ fontSize: '15px', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Industry ID</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Industry Code</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Industry Name</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Sector ID</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Sector Code</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Sector Name</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Sub-Sector ID</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Sub-Sector Code</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Sub-Sector Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && !loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {selectedIndustry ? `No industries found for "${selectedIndustry}".` : 'No industries available.'}
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} style={{ height: '40px', borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '6px 12px' }}>{item.industryId}</td>
                  <td style={{ padding: '6px 12px' }}>{item.industryCode}</td>
                  <td style={{ padding: '6px 12px' }}>{item.industryName}</td>
                  <td style={{ padding: '6px 12px' }}>{item.sectorId}</td>
                  <td style={{ padding: '6px 12px' }}>{item.sectorCode}</td>
                  <td style={{ padding: '6px 12px' }}>{item.sectorName}</td>
                  <td style={{ padding: '6px 12px' }}>{item.subSectorId}</td>
                  <td style={{ padding: '6px 12px' }}>{item.subSectorCode}</td>
                  <td style={{ padding: '6px 12px' }}>{item.subSectorName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SessionExpiredPopup />
    </div>
  );
};

export default IndustriesTable;
