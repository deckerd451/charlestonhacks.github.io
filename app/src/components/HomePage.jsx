import { Link } from 'react-router-dom';

export function HomePage() {
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
