import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import WaiterDashboard from './pages/waiter/Dashboard';
import NewOrder from './pages/waiter/NewOrder';
import KitchenDisplay from './pages/kitchen/Display';
import TVDisplay from './pages/TVDisplay';
import PendingBills from './pages/PendingBills';
import AdminPanel from './pages/AdminPanel';
import Disponibilidad from './pages/Disponibilidad';

function StaffLayout() {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-cream-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/kitchen" element={<ProtectedRoute roles={['admin', 'cocina']}><KitchenDisplay /></ProtectedRoute>} />
        <Route path="/tv" element={<ProtectedRoute roles={['admin', 'cocina', 'mesero']}><TVDisplay /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
        <Route element={<StaffLayout />}>
          <Route path="/waiter" element={<ProtectedRoute roles={['admin', 'mesero']}><WaiterDashboard /></ProtectedRoute>} />
          <Route path="/waiter/new-order" element={<ProtectedRoute roles={['admin', 'mesero']}><NewOrder /></ProtectedRoute>} />
          <Route path="/pending-bills" element={<ProtectedRoute roles={['admin', 'mesero']}><PendingBills /></ProtectedRoute>} />
          <Route path="/disponibilidad" element={<ProtectedRoute roles={['admin', 'mesero', 'cocina']}><Disponibilidad /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
