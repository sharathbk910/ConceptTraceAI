import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute.js';
import { AppLayout } from '../components/layout/AppLayout.js';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage.js';
import { RegisterPage } from '../pages/auth/RegisterPage.js';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage.js';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.js';
import { SetupProfilePage } from '../pages/auth/SetupProfilePage.js';
import { AuthCallbackPage } from '../pages/auth/AuthCallbackPage.js';

// Application Pages
import { HomePage } from '../pages/HomePage.js';
import { ProfilePage } from '../pages/ProfilePage.js';
import { AskDoubtPage } from '../pages/AskDoubtPage.js';
import { QuestionResultPage } from '../pages/QuestionResultPage.js';
import { HistoryPage } from '../pages/HistoryPage.js';
import { WeakTopicsPage } from '../pages/WeakTopicsPage.js';
import { WeakTopicDetailPage } from '../pages/WeakTopicDetailPage.js';
import { PracticePage } from '../pages/PracticePage.js';
import { PracticeSessionPage } from '../pages/PracticeSessionPage.js';
import { PracticeResultsPage } from '../pages/PracticeResultsPage.js';
import { ProgressPage } from '../pages/ProgressPage.js';
import { SettingsPage } from '../pages/SettingsPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { SyllabusPage } from '../pages/SyllabusPage.js';
import { ReviewMistakesPage } from '../pages/ReviewMistakesPage.js';
import { ConceptLibraryPage } from '../pages/ConceptLibraryPage.js';
import { useAuth } from '../hooks/useAuth.js';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, educationProfile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Unauthenticated visitors strictly land on /login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Authenticated students without a complete profile must complete setup
  if (!educationProfile?.onboarding_completed) return <Navigate to="/setup-profile" replace />;

  // Returning authenticated students go directly to dashboard
  return <Navigate to="/home" replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public / Landing Redirect */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* First-time onboarding (only for authenticated students) */}
      <Route
        path="/setup-profile"
        element={
          <ProtectedRoute requiresCompletedProfile={false}>
            <SetupProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Authenticated Dashboard & Learning Pages */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/syllabus" element={<SyllabusPage />} />
        <Route path="/library" element={<ConceptLibraryPage />} />
        <Route path="/mistakes" element={<ReviewMistakesPage />} />
        <Route path="/ask" element={<AskDoubtPage />} />
        <Route path="/questions/:id" element={<QuestionResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/weak-topics" element={<WeakTopicsPage />} />
        <Route path="/weak-topics/:topicId" element={<WeakTopicDetailPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/practice/:sessionId" element={<PracticeSessionPage />} />
        <Route path="/practice/:sessionId/results" element={<PracticeResultsPage />} />
        
        {/* Progress Report Routes */}
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/progress/graphs" element={<ProgressPage />} />
        <Route path="/progress/subjects" element={<ProgressPage />} />
        <Route path="/progress/weak-topics" element={<ProgressPage />} />
        <Route path="/progress/activity" element={<ProgressPage />} />

        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
