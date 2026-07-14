import { useState, useEffect } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Login from './pages/Login';
import Register from './pages/Register';
import WaiterDashboard from './pages/waiter/Dashboard';
import NewOrder from './pages/waiter/NewOrder';
import KitchenDisplay from './pages/kitchen/Display';
import Checkout from './pages/Checkout';
import MyOrders from './pages/MyOrders';
import OrderLocal from './pages/OrderLocal';
import Join from './pages/Join';
import History from './pages/History';
import Jobs from './pages/Jobs';
import ClientDashboard from './pages/ClientDashboard';
import TVDisplay from './pages/TVDisplay';
import PendingBills from './pages/PendingBills';
import AdminPanel from './pages/AdminPanel';
import QRPage from './pages/QRPage';
import Profile from './pages/Profile';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import { settings as settingsApi } from './api';

function WhatsAppBtn() {
  const [wa, setWa] = useState('525512345678');
  useEffect(() => { settingsApi.get().then(s => { if (s.whatsapp) setWa(s.whatsapp); }).catch(() => {}); }, []);
  return (
    <a href={`https://wa.me/${wa}?text=${encodeURIComponent('¡Hola! Quiero ordenar unos tacos 🍃')}`}
      target="_blank" rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-green-500 rounded-full shadow-lg hover:bg-green-600 hover:scale-110 transition flex items-center justify-center text-white text-3xl"
      aria-label="Pedir por WhatsApp">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  );
}

function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
      <WhatsAppBtn />
    </>
  );
}

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
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/tv" element={<TVDisplay />} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<ProtectedRoute roles={['admin', 'mesero', 'cocina', 'cliente']}><Profile /></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute roles={['admin', 'mesero']}><POS /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute roles={['admin', 'mesero', 'cocina']}><Inventory /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['admin', 'mesero']}><Reports /></ProtectedRoute>} />
          <Route path="/pending-bills" element={<ProtectedRoute roles={['admin', 'mesero']}><PendingBills /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'cliente']}><ClientDashboard /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute roles={['admin', 'mesero', 'cliente']}><MyOrders /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute roles={['admin', 'mesero', 'cocina', 'cliente']}><History /></ProtectedRoute>} />
          <Route path="/local-dashboard" element={<ClientDashboard />} />
          <Route path="/local-order" element={<OrderLocal />} />
          <Route path="/qr" element={<QRPage />} />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/join" element={<Join />} />
        </Route>
        <Route element={<StaffLayout />}>
          <Route path="/waiter" element={<ProtectedRoute roles={['admin', 'mesero']}><WaiterDashboard /></ProtectedRoute>} />
          <Route path="/waiter/new-order" element={<ProtectedRoute roles={['admin', 'mesero']}><NewOrder /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
