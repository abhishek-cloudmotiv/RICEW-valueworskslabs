import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import SignUp from './components/Auth/SignUp';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './components/Layout/Dashboard';
import PublicSpecificationView from './components/Deliver Manager/Functional Specification/PublicSpecificationView';
import TechnicalPublicSpecifiacationView from './components/Deliver Manager/Technical Specification/TechnicalPublicSpecifiacationView';
import PublicDeveloperSpecificationView from './components/Deliver Manager/Developer Specification/PublicDeveloperSpecificationView';
import PublicSI_FT_TechnicalOwnerFeedback from './components/Deliver Manager/Functional Testing Assignment/PublicSI_FT_TechnicalOwnerFeedback';
import PublicRiskAndIssueSpecificationView from './components/Deliver Manager/Risk And Issue Specification/PublicRiskAndIssueSpecificationView';
import PublicRiskAndIssueClientFeedbackView from './components/Deliver Manager/Risk And Issue Specification/PublicRiskAndIssueClientFeedbackView';
import PublicChangeRequestDecisionView from './components/RICEW Request/Change Request/PublicChangeRequestDecisionView';
import PublicChangeRequestReadOnlyView from './components/RICEW Request/Change Request/PublicChangeRequestReadOnlyView';
import PublicAutoRICEWAIView from './components/PublicAutoRICEWAIView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import SessionExpiredPopup from './components/SessionExpiredPopup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes: Data stays fresh for 5 mins
      gcTime: 1000 * 60 * 10,    // 10 minutes: Delete from memory after 10 mins of inactivity
      retry: 1,                 // Only retry failed requests once instead of thrice
      refetchOnWindowFocus: false, // Don't refetch every time the user clicks back onto the browser tab
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionProvider>
          <Router>
            <div className="App">
              <AppRoutes />
              <SessionExpiredPopup />
            </div>
          </Router>
        </SessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppRoutes() {
  const { isLoggedIn, isInitialized, logout } = useAuth();

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !isLoggedIn ? (
            <Login />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/project/:projectId/login"
        element={
          !isLoggedIn ? (
            <Login />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/signup"
        element={
          !isLoggedIn ? (
            <SignUp />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/forgot-password"
        element={
          !isLoggedIn ? (
            <ForgotPassword />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/public/initiate-work-view/:id"
        element={<PublicSpecificationView />}
      />
      <Route
        path="/public/technical-initiate-work-view/:id"
        element={<TechnicalPublicSpecifiacationView />}
      />
      <Route
        path="/public/developer-initiate-work-view/:id"
        element={<PublicDeveloperSpecificationView />}
      />
      <Route
        path="/public/Client-functional-testing-feedback-view/:id"
        element={<PublicSI_FT_TechnicalOwnerFeedback />}
      />
      <Route
        path="/public/risk-and-issue-view/:id"
        element={<PublicRiskAndIssueSpecificationView />}
      />
      <Route
        path="/public/client-verification-view/:id"
        element={<PublicRiskAndIssueClientFeedbackView />}
      />
      <Route
        path="/public/change-request-decision/:token"
        element={<PublicChangeRequestDecisionView />}
      />
      <Route
        path="/public/change-request-view/:token"
        element={<PublicChangeRequestReadOnlyView />}
      />
      <Route
        path="/public/auto-ricew-ai/:id"
        element={<PublicAutoRICEWAIView />}
      />
      <Route
        path="/dashboard/*"
        element={
          isLoggedIn ? (
            <Dashboard onLogout={logout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/"
        element={
          <Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />
        }
      />
    </Routes>
  );
}

export default App;