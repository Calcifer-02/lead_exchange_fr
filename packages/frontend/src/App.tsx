import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/Auth'
import MainLayout from './components/layout/MainLayout'
import DashboardPage from './pages/Dashboard'
import MyObjectsPage from './pages/MyObjects'
import NewObjectPage from './pages/NewObject'
import LeadsCatalogPage from './pages/LeadsCatalog'
import LeadDetailPage from './pages/LeadDetail'
import DealsPage from './pages/Deals'
import FinancePage from './pages/Finance'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="my-objects" element={<MyObjectsPage />} />
          <Route path="my-objects/new" element={<NewObjectPage />} />
          <Route path="leads-catalog" element={<LeadsCatalogPage />} />
          <Route path="leads-catalog/:id" element={<LeadDetailPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="finance" element={<FinancePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
