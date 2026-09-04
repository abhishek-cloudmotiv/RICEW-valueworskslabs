import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import ResourceRosterFormDetails from './ResourceRosterFormDetails';
import NewDashbordResource from './NewDashbordResource';

const ResourceRosterForm = ({ onClose, selectedProject, onBackToLanding, onLogout }) => {
  const navigate = useNavigate();
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

  useEffect(() => {
    const projectId = localStorage.getItem('project_id');
    if (!selectedProject?.id && !projectId) {
      setShowNoProjectSelectedPopup(true);
    }
  }, [selectedProject?.id]);

  const handleBackToList = () => {
    navigate('/dashboard/implementation-resource-form');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={
          <NewDashbordResource
            onClose={handleBackToList}
            onBackToLanding={onBackToLanding}
            onLogout={onLogout}
            selectedProject={selectedProject}
          />
        } />
        <Route path="/create" element={
          <ResourceRosterFormDetails
            onClose={handleBackToList}
            onBackToLanding={onBackToLanding}
            onBackToList={handleBackToList}
            onLogout={onLogout}
            selectedProject={selectedProject}
            formId={null}
          />
        } />
        <Route path="/edit/:id" element={
          <ResourceRosterFormDetails
            onClose={handleBackToList}
            onBackToLanding={onBackToLanding}
            onBackToList={handleBackToList}
            onLogout={onLogout}
            selectedProject={selectedProject}
          />
        } />
      </Routes>

      {showNoProjectSelectedPopup && (
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
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            textAlign: 'center',
            maxWidth: '380px',
            width: '90%'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#fff1f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertCircle size={36} color="#e11d48" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>No Project Selected</h2>
            <p style={{ color: '#4b5563', marginBottom: '28px', lineHeight: '1.6', fontSize: '15px' }}>
              Please select a project from the <strong>Project Definition Form</strong> before accessing this page.
            </p>
            <button
              onClick={() => navigate('/dashboard/project-definition-form')}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                width: '100%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Go to Project Definition
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ResourceRosterForm;
