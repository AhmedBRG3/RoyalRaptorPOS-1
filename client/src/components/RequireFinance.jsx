import { Navigate, useLocation } from 'react-router-dom';

export default function RequireFinance({ children }) {
  const location = useLocation();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {}
  const isFinance = !!(user?.finance || user?.admin);
  if (!isFinance) {
    return <Navigate to="/sales" replace state={{ from: location.pathname }} />;
  }
  return children;
}



