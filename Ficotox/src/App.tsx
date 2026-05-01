import { type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import './App.css'
import ConsumiblesPage from './pages/ConsumiblesPage'
import DashboardPage from './pages/DashboardPage'
import EquiposPage from './pages/EquiposPage'
import LoginPage from './pages/LoginPage'
import MantenimientoPage from './pages/MantenimientoPage'
import MovimientosPage from './pages/MovimientosPage'
import MuestrasPage from './pages/MuestrasPage'
import ReactivosPage from './pages/ReactivosPage'
import ReportesPage from './pages/ReportesPage'
import RolesPage from './pages/RolesPage'
import UsuariosPage from './pages/UsuariosPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = Boolean(localStorage.getItem('ficotox_auth'))

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reactivos" element={<ReactivosPage />} />
        <Route path="/consumibles" element={<ConsumiblesPage />} />
        <Route path="/equipos" element={<EquiposPage />} />
        <Route path="/muestras" element={<MuestrasPage />} />
        <Route path="/movimientos" element={<MovimientosPage />} />
        <Route path="/mantenimiento" element={<MantenimientoPage />} />
        <Route path="/reportes-mantenimiento" element={<ReportesPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
