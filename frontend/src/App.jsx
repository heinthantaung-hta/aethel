import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Sidebar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import AddEntry from './pages/AddEntry';
import Backlog from './pages/Backlog';
import Profile from './pages/Profile';
import Feed from './pages/Feed';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserProfile from './pages/UserProfile';
import WhatsNew from './pages/WhatsNew';

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="pt-14 min-h-screen bg-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}

// Route only accessible by regular users (not admins)
function UserOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <ProtectedRoute>{children}</ProtectedRoute>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
}

// Route only accessible by admins
function AdminOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <ProtectedRoute>{children}</ProtectedRoute>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/feed" replace />;
  return children;
}

// Smart default redirect based on role
function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/feed'} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Default → role-based redirect */}
            <Route path="/" element={<ProtectedRoute><DefaultRedirect /></ProtectedRoute>} />

            {/* Feed — all authenticated users */}
            <Route path="/feed"     element={<ProtectedRoute><AppLayout><Feed /></AppLayout></ProtectedRoute>} />
            <Route path="/feed/:id" element={<ProtectedRoute><AppLayout><PostDetail /></AppLayout></ProtectedRoute>} />

            {/* New post — users only */}
            <Route path="/feed/new" element={<UserOnlyRoute><AppLayout><CreatePost /></AppLayout></UserOnlyRoute>} />

            {/* Collection / tracker — users only */}
            <Route path="/collection" element={<UserOnlyRoute><AppLayout><Dashboard /></AppLayout></UserOnlyRoute>} />
            <Route path="/add"        element={<UserOnlyRoute><AppLayout><AddEntry /></AppLayout></UserOnlyRoute>} />
            <Route path="/watchlist"   element={<UserOnlyRoute><AppLayout><Backlog /></AppLayout></UserOnlyRoute>} />
            <Route path="/profile"    element={<UserOnlyRoute><AppLayout><Profile /></AppLayout></UserOnlyRoute>} />

            {/* Admin panel — admins only */}
            <Route path="/admin" element={<AdminOnlyRoute><AppLayout><AdminPanel /></AppLayout></AdminOnlyRoute>} />

            {/* What's New — all authenticated users */}
            <Route path="/whatsnew" element={<ProtectedRoute><AppLayout><WhatsNew /></AppLayout></ProtectedRoute>} />

            {/* Public user profiles — all authenticated */}
            <Route path="/u/:username" element={<ProtectedRoute><AppLayout><UserProfile /></AppLayout></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
