import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import Calendar from './features/calendar/Calendar';
import Layout from './components/Layout';
import { CalendarProvider } from './features/calendar/context/CalendarContext';

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading authentication...</div>; // Or a proper loading spinner
  }

  return (
    <Router>
      <CalendarProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={isAuthenticated ? <Layout><Calendar /></Layout> : <Navigate to="/login" replace />}
          />
        </Routes>
      </CalendarProvider>
    </Router>
  );
};

export default App;