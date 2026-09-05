import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';
import Loader from '../../utils/Loader';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';

const CategorySubcategory = ({ selectedProject }) => {
  const { handleAuthError } = useSession();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  // Click outside handler for help popup
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

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const { data: categoryData = [], isLoading } = useQuery({
    queryKey: ['categorySubcategories'],
    queryFn: async () => {
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        throw new Error('Token not found');
      }

      const response = await fetch(GLOBAL_SETUP_API_CONFIG.CATEGORY_SUBCATEGORY_API_URL, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      const dataArray = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
      const apiData = dataArray.filter(item => {
        const delStat = item.SUB_DELETE_STATUS || item.delete_status;
        return delStat !== "true" && delStat !== "Y" && delStat !== true;
      });

      const categoryOrder = [
        "Functional",
        "Technical",
        "Infrastructure and Environment",
        "Security and Access Control",
        "Testing",
        "Cutover and Deployment",
        "Change Management and Training",
        "Program Governance",
        "Compliance and Regulatory",
        "Support"
      ];

      const sortedData = [...apiData].sort((a, b) => {
        const catA = (a.CATEGORY_NAME || a.Category_Name || '').trim();
        const catB = (b.CATEGORY_NAME || b.Category_Name || '').trim();
        
        const indexA = categoryOrder.indexOf(catA);
        const indexB = categoryOrder.indexOf(catB);
        
        if (indexA !== -1 && indexB !== -1) {
          if (indexA !== indexB) return indexA - indexB;
        } else if (indexA !== -1) {
          return -1;
        } else if (indexB !== -1) {
          return 1;
        } else if (catA !== catB) {
          return catA.localeCompare(catB);
        }

        const idA = parseInt(a.SUBCATEGORY_ID || a.Category_Subcategory_id) || 0;
        const idB = parseInt(b.SUBCATEGORY_ID || b.Category_Subcategory_id) || 0;
        return idA - idB;
      });

      return sortedData.map((item, index) => ({
        id: index + 1,
        categoryCode: DOMPurify.sanitize(String(item.CATEGORY_CODE || item.Category_Code || '').trim(), sanitizeConfig),
        category: DOMPurify.sanitize(String(item.CATEGORY_NAME || item.Category_Name || '').trim(), sanitizeConfig),
        subCategoryCode: DOMPurify.sanitize(String(item.SUBCATEGORY_CODE || item.Sub_Category_Code || '').trim(), sanitizeConfig),
        subCategory: DOMPurify.sanitize(String(item.SUBCATEGORY_NAME || item.Sub_Category_Name || '').trim(), sanitizeConfig),
        projectId: DOMPurify.sanitize(String(item.project_id || '').trim(), sanitizeConfig),
      }));
    }
  });

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Activity Category / Subcategory Relationship</h2>
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
              zIndex: 3000,
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
                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        The <strong>Category / Subcategory Relationship</strong> page defines how main project activities (like Functional, Technical, or Infrastructure) are broken down into more specific tasks and areas of expertise.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        This hierarchy is essential for detailed project planning and resource management. It allows managers to assign resources based on specific sub-category expertise (e.g., a Technical resource specifically for Conversions) and track effort at a highly granular level.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Category</strong> — The high-level activity group (e.g., Functional, Technical).</li>
                        <li><strong>Sub-Category</strong> — The specific task or expertise area belonging to that category (e.g., Configuration, Interfaces).</li>
                        <li><strong>Codes</strong> — Standardized identifiers used for internal tracking and system integration.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="table-container" style={{ height: 'calc(100vh - 265px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', width: '15%' }}>Category Code</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', width: '30%' }}>Category</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', width: '15%' }}>Sub-Category Code</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', width: '40%' }}>Sub-Category</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No category / subcategory records found.
                </td>
              </tr>
            ) : (
              categoryData.map((item) => (
                <tr key={item.id} data-row-id={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <span>{item.categoryCode}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span>{item.category}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span>{item.subCategoryCode}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ display: 'block', wordWrap: 'break-word' }}>{item.subCategory}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Loader loading={isLoading} />
    </div>
  );
};

export default CategorySubcategory;
