import React from 'react';
import { useAuth } from './hooks/useAuth';
import App from './App.jsx';
import AuthPage from './components/Auth/AuthPage.jsx';
import LoadingScreen from './components/UI/LoadingScreen.jsx';

const AppRoot = () => {
  const { user, authLoading, signOut } = useAuth();

  if (authLoading) return <LoadingScreen message="Verifica sessione..." />;
  if (!user) return <AuthPage />;
  return <App user={user} onSignOut={signOut} />;
};

export default AppRoot;
