import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { DialogProvider } from './context/DialogContext'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './hooks/useAuth'
import { AppShell } from './components/layout/AppShell'
import { SplashScreen } from './components/layout/SplashScreen'
import { LoginPage } from './pages/LoginPage'
import { DiarioPage } from './pages/DiarioPage'
import { StatistichePage } from './pages/StatistichePage'
import { AlimentiPage } from './pages/AlimentiPage'
import { ObiettiviPage } from './pages/ObiettiviPage'
import { ImpostazioniPage } from './pages/ImpostazioniPage'

/**
 * AuthGate component
 * Senza sessione mostra il login a qualsiasi URL; con la sessione monta i dati
 * dell'utente e le pagine.
 */
function AuthGate() {
  const { user, loading } = useAuth()

  if (loading) return <SplashScreen />
  if (!user) return <LoginPage />

  return (
    // key: cambiando utente i dati del precedente non restano in memoria
    <DataProvider key={user.id}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/diario" replace />} />
          <Route path="diario" element={<DiarioPage />} />
          <Route path="statistiche" element={<StatistichePage />} />
          <Route path="alimenti" element={<AlimentiPage />} />
          <Route path="obiettivi" element={<ObiettiviPage />} />
          <Route path="impostazioni" element={<ImpostazioniPage />} />
          <Route path="*" element={<Navigate to="/diario" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DialogProvider>
          <BrowserRouter>
            <AuthGate />
          </BrowserRouter>
        </DialogProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
