import { useEffect } from 'react';

export function AuthCallback() {
  useEffect(() => {
    // Handle OAuth callback - redirect to home
    window.location.href = '/app/';
  }, []);

  return <div className="loading">Processing login...</div>;
}
