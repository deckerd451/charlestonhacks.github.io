import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AuthModal } from './AuthModal';

export function Navigation() {
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
