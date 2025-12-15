import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/Auth'
import MainLayout from './components/layout/MainLayout'
import DashboardPage from './pages/Dashboard'
import MyObjectsPage from './pages/MyObjects'
import NewObjectPage from './pages/NewObject'
import NewLeadPage from './pages/NewLead'
import NewPropertyPage from './pages/NewProperty'
import LeadsCatalogPage from './pages/LeadsCatalog'
import LeadDetailPage from './pages/LeadDetail'
import PropertiesCatalogPage from './pages/PropertiesCatalog'
import PropertyDetailPage from './pages/PropertyDetail'
import DealsPage from './pages/Deals'
import FinancePage from './pages/Finance'
import ProfilePage from './pages/Profile'
import AdminPage from './pages/Admin'
import PropertyMatchingPage from './pages/PropertyMatching'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="my-objects" element={<MyObjectsPage />} />
          <Route path="my-objects/new" element={<NewObjectPage />} />
          <Route path="properties/new" element={<NewPropertyPage />} />
          <Route path="properties-catalog" element={<PropertiesCatalogPage />} />
          <Route path="properties/:propertyId" element={<PropertyDetailPage />} />
          <Route path="leads/new" element={<NewLeadPage />} />
          <Route path="leads-catalog" element={<LeadsCatalogPage />} />
          <Route path="leads-catalog/:id" element={<LeadDetailPage />} />
          <Route path="matching" element={<PropertyMatchingPage />} />
          <Route path="leads/:leadId/matching" element={<PropertyMatchingPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
