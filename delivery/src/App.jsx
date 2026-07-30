import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Menu from './pages/Menu';
import Checkout from './pages/Checkout';

function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-cream-50">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Menu />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
