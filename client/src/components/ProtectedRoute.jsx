import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Redirect to landing page if not authenticated
    return <Navigate to="/" replace />;
  }
  
  return children;
}

export default ProtectedRoute;
