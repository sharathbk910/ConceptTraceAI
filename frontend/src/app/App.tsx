import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth.js';
import { ToastProvider } from '../hooks/useToast.js';
import { AppRouter } from './router.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
