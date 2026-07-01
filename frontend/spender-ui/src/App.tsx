import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Shell from './components/layout/Shell';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TransactionsPage from './pages/transactions/TransactionsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import DebtPage from './pages/debt/DebtPage';
import HomePage from './pages/home/HomePage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<Shell />}>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/debt"      element={<DebtPage />} />
                <Route path="/home"     element={<HomePage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
