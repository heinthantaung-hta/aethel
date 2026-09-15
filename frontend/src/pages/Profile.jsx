import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Clicking "Profile" in nav redirects to /u/:username (the public-style profile view)
export default function Profile() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/u/${user.username}`} replace />;
}
