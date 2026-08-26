import { useState } from "react";

function App() {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <main className="app">
        <section className="dashboard">
          <header className="header">
            <div>
              <span className="welcome">Bienvenue</span>
              <h1>Carnet-de-Chasse</h1>
            </div>

            <div className="profile-button">
              👤
            </div>
          </header>

          <section className="season-card">
            <span>Saison</span>
            <strong>2026 — 2027</strong>
          </section>

          <h2>Mon activité</h2>

          <div className="stats-grid">
            <div className="stat-card">
              <span>📖</span>
              <strong>0</strong>
              <small>Sorties</small>
            </div>

            <div className="stat-card">
              <span>🦌</span>
              <strong>0</strong>
              <small>Prélèvements</small>
            </div>

            <div className="stat-card">
              <span>🐕</span>
              <strong>0</strong>
              <small>Chiens</small>
            </div>

            <div className="stat-card">
              <span>📍</span>
              <strong>0</strong>
              <small>Territoires</small>
            </div>
          </div>

          <h2>Actions rapides</h2>

          <button className="action-button">
            ➕ Nouvelle sortie
          </button>

          <button className="action-button secondary">
            📖 Ouvrir mon carnet
          </button>

          <nav className="bottom-nav">
            <button>🏠<span>Accueil</span></button>
            <button>📖<span>Carnet</span></button>
            <button className="add-button">＋</button>
            <button>🗺️<span>Carte</span></button>
            <button>📊<span>Stats</span></button>
          </nav>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="welcome-card">
        <div className="logo">🦌</div>

        <h1>Carnet-de-Chasse</h1>

        <p>
          Votre carnet de chasse numérique
        </p>

        <button
          className="start-button"
          onClick={() => setStarted(true)}
        >
          Commencer
        </button>
      </section>
    </main>
  );
}

export default App;
