import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>;

  if (!user) return <Navigate to="/login" replace />;
  if (!['socio', 'admin'].includes(user.role)) return <Navigate to="/login" replace />;

  return children;
}
