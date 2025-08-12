import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAdmin({ children }) {
  const location = useLocation();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {}
  const isAdmin = !!user?.admin;
  if (!isAdmin) {
    return <Navigate to="/sales" replace state={{ from: location.pathname }} />;
  }
  return children;
}


