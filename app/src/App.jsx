import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { AuthModal } from './components/AuthModal';
import { LegacyPageWrapper } from './components/LegacyPageWrapper';
import { ProfileForm } from './components/ProfileForm';
import { ProfileView } from './components/ProfileView';
import { DirectorySearch } from './components/DirectorySearch';
import { mantineTheme } from './theme/mantineTheme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function Navigation() {
  const { user, signOut } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();

  return (
    <nav className="main-nav">
      <div className="nav-brand">
        <Link to="/">CharlestonHacks</Link>
      </div>

      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Home
        </Link>
        <Link to="/directory" className={location.pathname === '/directory' ? 'active' : ''}>
          Directory
        </Link>
        <Link to="/profile" className={location.pathname.startsWith('/profile') ? 'active' : ''}>
          Profile
        </Link>
        <Link to="/innovation-engine" className={location.pathname === '/innovation-engine' ? 'active' : ''}>
          Innovation Engine
        </Link>
        <Link to="/neural" className={location.pathname === '/neural' ? 'active' : ''}>
          Neural
        </Link>
      </div>

      <div className="nav-auth">
        {user ? (
          <>
            <span className="user-email">{user.email}</span>
            <button onClick={signOut} className="btn-secondary">Sign Out</button>
          </>
        ) : (
          <button onClick={() => setShowAuthModal(true)} className="btn-primary">
            Sign In
          </button>
        )}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </nav>
  );
}

function HomePage() {
  return (
    <div className="home-page">
      <h1>Welcome to CharlestonHacks</h1>
      <p>This is the new React shell wrapping the legacy site.</p>
      <div className="feature-grid">
        <Link to="/innovation-engine" className="feature-card">
          <h3>🚀 Innovation Engine</h3>
          <p>Find collaborators and build teams</p>
        </Link>
        <Link to="/directory" className="feature-card">
          <h3>👥 Directory</h3>
          <p>Browse the talent directory</p>
        </Link>
        <Link to="/neural" className="feature-card">
          <h3>🧠 Neural Network</h3>
          <p>Visualize connections</p>
        </Link>
      </div>
    </div>
  );
}

function AuthCallback() {
  useEffect(() => {
    // Handle OAuth callback
    window.location.href = '/app/';
  }, []);

  return <div className="loading">Processing login...</div>;
}

function AppContent() {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Profile routes */}
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/profile/edit" element={<ProfileForm />} />
          <Route path="/profile/:userId" element={<ProfileView />} />

          {/* Directory route */}
          <Route path="/directory" element={<DirectorySearch />} />

          {/* Legacy pages wrapped in iframes */}
          <Route
            path="/innovation-engine"
            element={<LegacyPageWrapper pagePath="../2card.html" title="Innovation Engine" />}
          />
          <Route
            path="/neural"
            element={<LegacyPageWrapper pagePath="../neural.html" title="Neural Network" />}
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
        <Notifications position="top-right" />
        <BrowserRouter basename="/app">
          <AppContent />
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
