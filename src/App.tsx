import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Vehicles from './pages/Vehicles';
import Estimates from './pages/Estimates';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import EstimateForm from './pages/EstimateForm';
import Roles from './pages/Roles';
import Permissions from './pages/Permissions';
import Products from './pages/Products';
import CannedJobs from './pages/CannedJobs';
import CannedJobForm from './pages/CannedJobForm';
import Brands from './pages/Brands';
import Categories from './pages/Categories';
import GeneralSettings from './pages/GeneralSettings';
import FeesAndRates from './pages/FeesAndRates';
import Miscellaneous from './pages/Miscellaneous';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/canned-jobs" element={<CannedJobs />} />
            <Route path="/canned-jobs/new" element={<CannedJobForm />} />
            <Route path="/canned-jobs/:id" element={<CannedJobForm />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/users" element={<Users />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<EstimateForm />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<EstimateForm />} />
            <Route path="/estimates/new" element={<EstimateForm />} />
            <Route path="/estimates/:id" element={<EstimateForm />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/permissions" element={<Permissions />} />
            <Route path="/settings/general" element={<GeneralSettings />} />
            <Route path="/settings/fees-and-rates" element={<FeesAndRates />} />
            <Route path="/settings/miscellaneous" element={<Miscellaneous />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
