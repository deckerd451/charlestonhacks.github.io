import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import './AuthModal.css';

export function AuthModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { signInWithOAuth, signInWithMagicLink } = useAuthStore();

  if (!isOpen) return null;

  const handleOAuth = async (provider) => {
    setLoading(true);
    try {
      await signInWithOAuth(provider);
      // OAuth will redirect, so no need to close modal
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setMessage('Magic link sent! Check your email.');
      setLoading(false);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <h2>Sign In</h2>

        <div className="oauth-buttons">
          <button
            className="oauth-btn linkedin"
            onClick={() => handleOAuth('linkedin_oidc')}
            disabled={loading}
          >
            <span className="icon">in</span>
            Sign in with LinkedIn
          </button>

          <button
            className="oauth-btn facebook"
            onClick={() => handleOAuth('facebook')}
            disabled={loading}
          >
            <span className="icon">f</span>
            Sign in with Facebook
          </button>

          <button
            className="oauth-btn google"
            onClick={() => handleOAuth('google')}
            disabled={loading}
          >
            <span className="icon">G</span>
            Sign in with Google
          </button>
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        <form onSubmit={handleMagicLink}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="magic-link-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}
