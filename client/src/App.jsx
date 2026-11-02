import { useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import IssueDetailsPage from './pages/IssueDetailsPage';
import ReportIssuePage from './pages/ReportIssuePage';
import MyReportsPage from './pages/MyReportsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminIssueDetailsPage from './pages/AdminIssueDetailsPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import AppealPage from './pages/AppealPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminSpamQueuePage from './pages/AdminSpamQueuePage';
import NotificationsPage from './pages/NotificationsPage';

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const PAGE_TRANSITION = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};

function AnimatedRoutes() {
  const location = useLocation();

  const routesNode = useMemo(() => (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/appeal" element={<AppealPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/issues/:id" element={<IssueDetailsPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['citizen']}>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute roles={['citizen']}>
            <ReportIssuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-reports"
        element={
          <ProtectedRoute roles={['citizen']}>
            <MyReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute roles={['citizen', 'officer', 'admin']}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['officer', 'admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/issues/:id"
        element={
          <ProtectedRoute roles={['officer', 'admin']}>
            <AdminIssueDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={<ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/spam"
        element={<ProtectedRoute roles={['officer', 'admin']}><AdminSpamQueuePage /></ProtectedRoute>}
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  ), [location]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={PAGE_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={PAGE_TRANSITION}
      >
        {routesNode}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <MainLayout>
      <AnimatedRoutes />
    </MainLayout>
  );
}
