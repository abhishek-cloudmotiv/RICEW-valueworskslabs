import React, { useState } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';

const Header = ({ sidebarOpen, onToggleSidebar, unsavedChangesChecker }) => {
  const { logout } = useAuth();
  const { clearSession } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Check if we're on a sub-page (not the main dashboard)
  const isSubPage = location.pathname !== '/dashboard' && location.pathname !== '/dashboard/';

  const showConfirmation = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmDialog(true);
  };

  const handleConfirmYes = () => {
    // Close dialog
    setShowConfirmDialog(false);
    const action = confirmAction;
    setConfirmAction(null);
    setConfirmMessage('');

    // Execute action immediately
    if (action) {
      action();
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleBackClick = () => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = typeof unsavedChangesChecker === 'function' ? unsavedChangesChecker() : false;

    if (hasUnsavedChanges) {
      // Show confirmation dialog
      showConfirmation(
        'You have unsaved changes. Please save your changes before going back. Do you want to continue anyway?',
        () => {
          // Navigate after user confirms
          if (location.pathname.includes('/dashboard/implementation-resource-form/create') ||
            location.pathname.includes('/dashboard/implementation-resource-form/edit')) {
            navigate('/dashboard/implementation-resource-form');
          } else if (location.pathname.includes('/dashboard/ricew-dashboard/RICEW-request-create') ||
            location.pathname.includes('/dashboard/ricew-dashboard/RICEW-request/edit/')) {
            if (location.search.includes('from=approval')) {
              navigate('/dashboard/approval-dashboard');
            } else {
              navigate('/dashboard/ricew-dashboard');
            }
          } else if (location.pathname.includes('/dashboard/risk-and-issue-form/create') ||
            location.pathname.includes('/dashboard/risk-and-issue-form/edit')) {
            navigate('/dashboard/risk-and-issue-form');
          } else if (location.pathname.includes('/dashboard/change-request-form/create') ||
            location.pathname.includes('/dashboard/change-request-form/edit')) {
            if (location.search.includes('from=approval')) {
              navigate('/dashboard/change-request-approval-dashboard');
            } else {
              navigate('/dashboard/change-request-form');
            }
          } else if (location.pathname.includes('/dashboard/functional-specification-view/')) {
            if (location.search.includes('from=developer-assignment')) {
              navigate('/dashboard/developer-specification-assignment-form');
            } else if (location.search.includes('from=technical-assignment')) {
              navigate('/dashboard/technical-specification-assignment-form');
            } else {
              navigate('/dashboard/functional-specification-assignment-form');
            }
          } else if (location.pathname.includes('/dashboard/technical-specification-view/')) {
            if (location.search.includes('from=technical-assignment')) {
              navigate('/dashboard/technical-specification-assignment-form');
            } else {
              navigate('/dashboard/technical-specification-assignment-form'); // Default behavior
            }
          } else if (location.pathname.includes('/dashboard/risk-and-issue-specification-view/')) {
            navigate('/dashboard/risk-and-issue-specification-assignment-form');
          } else if (location.pathname.includes('/dashboard/specification-writer-initiate-work/')) {
            navigate('/dashboard/initiate-specification-writing-summary');
          } else if (location.pathname.includes('/dashboard/technical-writer-initiate-work/')) {
            navigate('/dashboard/initiate-technical-writing-summary');
          } else if (location.pathname.includes('/dashboard/developer-writer-initiate-work/')) {
            navigate('/dashboard/initiate-developer-writing-summary');
          } else if (location.pathname.includes('/dashboard/functional-testing-writer-initiate-work/')) {
            navigate('/dashboard/initiate-functional-testing-writing-summary');
          } else if (location.pathname.includes('/dashboard/risk-and-issue-writer-initiate-work/')) {
            navigate('/dashboard/initiate-risk-and-issue-writing-summary');
          } else if (location.pathname.includes('/dashboard/initiate-specification-writing-summary') ||
            location.pathname.includes('/dashboard/initiate-technical-writing-summary') ||
            location.pathname.includes('/dashboard/initiate-developer-writing-summary')) {
            navigate('/dashboard');
          } else if (location.pathname.includes('/dashboard/resource-definition-form')) {
            navigate('/dashboard/resource-definition-dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      );
    } else {
      // No unsaved changes, navigate directly
      if (location.pathname.includes('/dashboard/implementation-resource-form/create') ||
        location.pathname.includes('/dashboard/implementation-resource-form/edit')) {
        navigate('/dashboard/implementation-resource-form');
      } else if (location.pathname.includes('/dashboard/ricew-dashboard/RICEW-request-create') ||
        location.pathname.includes('/dashboard/ricew-dashboard/RICEW-request/edit/')) {
        if (location.search.includes('from=approval')) {
          navigate('/dashboard/approval-dashboard');
        } else {
          navigate('/dashboard/ricew-dashboard');
        }
      } else if (location.pathname.includes('/dashboard/risk-and-issue-form/create') ||
        location.pathname.includes('/dashboard/risk-and-issue-form/edit')) {
        navigate('/dashboard/risk-and-issue-form');
      } else if (location.pathname.includes('/dashboard/change-request-form/create') ||
        location.pathname.includes('/dashboard/change-request-form/edit')) {
        if (location.search.includes('from=approval')) {
          navigate('/dashboard/change-request-approval-dashboard');
        } else {
          navigate('/dashboard/change-request-form');
        }
      } else if (location.pathname.includes('/dashboard/functional-specification-view/')) {
        if (location.search.includes('from=developer-assignment')) {
          navigate('/dashboard/developer-specification-assignment-form');
        } else if (location.search.includes('from=technical-assignment')) {
          navigate('/dashboard/technical-specification-assignment-form');
        } else {
          navigate('/dashboard/functional-specification-assignment-form');
        }
      } else if (location.pathname.includes('/dashboard/technical-specification-view/')) {
        if (location.search.includes('from=technical-assignment')) {
          navigate('/dashboard/technical-specification-assignment-form');
        } else {
          navigate('/dashboard/technical-specification-assignment-form'); // Default behavior
        }
      } else if (location.pathname.includes('/dashboard/risk-and-issue-specification-view/')) {
        navigate('/dashboard/risk-and-issue-specification-assignment-form');
      } else if (location.pathname.includes('/dashboard/specification-writer-initiate-work/')) {
        navigate('/dashboard/initiate-specification-writing-summary');
      } else if (location.pathname.includes('/dashboard/technical-writer-initiate-work/')) {
        navigate('/dashboard/initiate-technical-writing-summary');
      } else if (location.pathname.includes('/dashboard/developer-writer-initiate-work/')) {
        navigate('/dashboard/initiate-developer-writing-summary');
      } else if (location.pathname.includes('/dashboard/functional-testing-writer-initiate-work/')) {
        navigate('/dashboard/initiate-functional-testing-writing-summary');
      } else if (location.pathname.includes('/dashboard/risk-and-issue-writer-initiate-work/')) {
        navigate('/dashboard/initiate-risk-and-issue-writing-summary');
      } else if (location.pathname.includes('/dashboard/initiate-specification-writing-summary') ||
        location.pathname.includes('/dashboard/initiate-technical-writing-summary') ||
        location.pathname.includes('/dashboard/initiate-developer-writing-summary')) {
        navigate('/dashboard');
      } else if (location.pathname.includes('/dashboard/resource-definition-form')) {
        navigate('/dashboard/resource-definition-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleLogoutClick = () => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = typeof unsavedChangesChecker === 'function' ? unsavedChangesChecker() : false;

    const message = hasUnsavedChanges
      ? 'You have unsaved changes. Please save your changes before logging out. Do you want to continue logging out anyway?'
      : 'Are you sure you want to log out?';

    // Always show confirmation dialog for logout
    showConfirmation(message, async () => {
      await logout();
      clearSession();
    });
  };


  const userName = localStorage.getItem('user_name');

  return (
    <div className="header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {!sidebarOpen && (
          <button
            className="bg-transparent border-0 text-xl cursor-pointer"
            onClick={onToggleSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Menu size={24} />
          </button>
        )}
        {isSubPage && (
          <button
            className="config-back-btn"
            onClick={handleBackClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem'
            }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
        )}
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {userName && (
          <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: '600', color: '#4b5563', fontSize: '1rem' }}>
              {userName}
            </span>
          </div>
        )}
        <button
          className="logout-btn"
          onClick={handleLogoutClick}
        >
          Logout
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
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
          zIndex: 2000
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
              Confirmation
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              {confirmMessage}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleConfirmCancel}
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
                onClick={handleConfirmYes}
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
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
