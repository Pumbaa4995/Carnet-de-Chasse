import { useEffect, useMemo, useState } from "react";

type Harvest = {
  species: string;
  quantity: number;
};

type HuntingTrip = {
  id: string;
  date: string;
  territory: string;
  huntType: string;
  harvests: Harvest[];
  dogs: string[];
  notes: string;
};

const SPECIES = [
  "Brocard",
  "Bique",
  "Chevrillard",
  "Cerf",
  "Biche",
  "Faon",
  "Sanglier",
  "Laie",
  "Renard",
  "Renarde",
  "Blaireau",
  "Fouine",
];

const DOGS = [
  "Simba",
  "Pepsi",
  "Périgord",
  "Oscar",
  "Ulysse",
  "Voyou",
  "Vezin",
  "Vernoil",
  "Vito",
  "Volvo",
  "Spirou",
  "Ouragan",
  "Alto",
  "Panloup",
  "Oasis",
  "Otello",
  "Tempête",
];

const STORAGE_KEY = "carnet-de-chasse-trips";

function App() {
  const [started, setStarted] = useState(
    localStorage.getItem("carnet-started") === "1"
  );

  const [trips, setTrips] = useState<HuntingTrip[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [screen, setScreen] = useState<
    "home" | "carnet" | "stats"
  >("home");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    territory: "",
    huntType: "Petit gibier",
    harvests: [] as Harvest[],
    dogs: [] as string[],
    notes: "",
  });

  const [species, setSpecies] = useState(SPECIES[0]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(trips)
    );
  }, [trips]);

  const totalHarvests = useMemo(() => {
    return trips.reduce(
      (total, trip) =>
        total +
        trip.harvests.reduce(
          (sum, harvest) => sum + harvest.quantity,
          0
        ),
      0
    );
  }, [trips]);

  function startApp() {
    setStarted(true);
    localStorage.setItem("carnet-started", "1");
  }

  function newTrip() {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      territory: "",
      huntType: "Petit gibier",
      harvests: [],
      dogs: [],
      notes: "",
    });

    setSpecies(SPECIES[0]);
    setQuantity(1);
    setShowForm(true);
  }

  function addHarvest() {
    setForm((current) => {
      const existing = current.harvests.find(
        (item) => item.species === species
      );

      if (existing) {
        return {
          ...current,
          harvests: current.harvests.map((item) =>
            item.species === species
              ? {
                  ...item,
                  quantity:
                    item.quantity + quantity,
                }
              : item
          ),
        };
      }

      return {
        ...current,
        harvests: [
          ...current.harvests,
          {
            species,
            quantity,
          },
        ],
      };
    });

    setQuantity(1);
  }

  function toggleDog(dog: string) {
    setForm((current) => ({
      ...current,
      dogs: current.dogs.includes(dog)
        ? current.dogs.filter(
            (item) => item !== dog
          )
        : [...current.dogs, dog],
    }));
  }

  function saveTrip() {
    if (!form.territory.trim()) {
      alert("Indique le territoire.");
      return;
    }

    const trip: HuntingTrip = {
      ...form,
      id: crypto.randomUUID(),
    };

    setTrips((current) => [
      trip,
      ...current,
    ]);

    setShowForm(false);
    setScreen("carnet");
  }

  function deleteTrip(id: string) {
    setTrips((current) =>
      current.filter(
        (trip) => trip.id !== id
      )
    );
  }

  if (!started) {
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
            onClick={startApp}
          >
            Commencer
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="dashboard">

        <header className="header">
          <div>
            <span className="welcome">
              Bienvenue
            </span>

            <h1>
              Carnet-de-Chasse
            </h1>
          </div>

          <div className="profile-button">
            👤
          </div>
        </header>

        {screen === "home" && (
          <>
            <section className="season-card">
              <span>Saison</span>
              <strong>
                2026 — 2027
              </strong>
            </section>

            <h2>Mon activité</h2>

            <div className="stats-grid">

              <div className="stat-card">
                <span>📖</span>
                <strong>
                  {trips.length}
                </strong>
                <small>
                  Sorties
                </small>
              </div>

              <div className="stat-card">
                <span>🦌</span>
                <strong>
                  {totalHarvests}
                </strong>
                <small>
                  Prélèvements
                </small>
              </div>

              <div className="stat-card">
                <span>🐕</span>
                <strong>
                  {new Set(
                    trips.flatMap(
                      (trip) => trip.dogs
                    )
                  ).size}
                </strong>
                <small>
                  Chiens
                </small>
              </div>

              <div className="stat-card">
                <span>📍</span>
                <strong>
                  {new Set(
                    trips.map(
                      (trip) =>
                        trip.territory
                    )
                  ).size}
                </strong>
                <small>
                  Territoires
                </small>
              </div>

            </div>

            <h2>
              Actions rapides
            </h2>

            <button
              className="action-button"
              onClick={newTrip}
            >
              ➕ Nouvelle sortie
            </button>

            <button
              className="action-button secondary"
              onClick={() =>
                setScreen("carnet")
              }
            >
              📖 Ouvrir mon carnet
            </button>
          </>
        )}

        {screen === "carnet" && (
          <>
            <div className="page-title">
              <h2>Mon carnet</h2>

              <button
                className="action-button"
                onClick={newTrip}
              >
                ＋ Ajouter
              </button>
            </div>

            {trips.length === 0 ? (
              <div className="stat-card">
                <strong>
                  Aucune sortie
                </strong>

                <small>
                  Enregistrez votre première
                  journée de chasse.
                </small>
              </div>
            ) : (
              trips.map((trip) => (
                <article
                  className="stat-card"
                  key={trip.id}
                >
                  <strong>
                    {new Date(
                      trip.date +
                        "T12:00:00"
                    ).toLocaleDateString(
                      "fr-FR"
                    )}
                  </strong>

                  <small>
                    📍 {trip.territory}
                  </small>

                  <small>
                    🎯{" "}
                    {trip.harvests.length
                      ? trip.harvests
                          .map(
                            (item) =>
                              `${item.species} ×${item.quantity}`
                          )
                          .join(", ")
                      : "Aucun prélèvement"}
                  </small>

                  {trip.dogs.length > 0 && (
                    <small>
                      🐕{" "}
                      {trip.dogs.join(", ")}
                    </small>
                  )}

                  {trip.notes && (
                    <small>
                      📝 {trip.notes}
                    </small>
                  )}

                  <button
                    onClick={() =>
                      deleteTrip(trip.id)
                    }
                  >
                    Supprimer
                  </button>
                </article>
              ))
            )}
          </>
        )}

        {screen === "stats" && (
          <>
            <h2>
              Statistiques
            </h2>

            <div className="stats-grid">

              <div className="stat-card">
                <strong>
                  {trips.length}
                </strong>

                <small>
                  Sorties
                </small>
              </div>

              <div className="stat-card">
                <strong>
                  {totalHarvests}
                </strong>

                <small>
                  Prélèvements
                </small>
              </div>

            </div>
          </>
        )}

        <nav className="bottom-nav">

          <button
            onClick={() =>
              setScreen("home")
            }
          >
            🏠
            <span>
              Accueil
            </span>
          </button>

          <button
            onClick={() =>
              setScreen("carnet")
            }
          >
            📖
            <span>
              Carnet
            </span>
          </button>

          <button
            className="add-button"
            onClick={newTrip}
          >
            ＋
          </button>

          <button
            onClick={() =>
              setScreen("home")
            }
          >
            🗺️
            <span>
              Carte
            </span>
          </button>

          <button
            onClick={() =>
              setScreen("stats")
            }
          >
            📊
            <span>
              Stats
            </span>
          </button>

        </nav>

      </section>

      {showForm && (
        <div className="modal">

          <section className="form-card">

            <h2>
              Nouvelle sortie
            </h2>

            <label>
              Date

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Territoire

              <input
                value={form.territory}
                placeholder="Ex. Bois de la Vallée"
                onChange={(event) =>
                  setForm({
                    ...form,
                    territory:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Type de chasse

              <select
                value={form.huntType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    huntType:
                      event.target.value,
                  })
                }
              >
                <option>
                  Petit gibier
                </option>

                <option>
                  Grand gibier
                </option>

                <option>
                  Battue
                </option>

                <option>
                  Approche
                </option>

                <option>
                  Affût
                </option>
              </select>
            </label>

            <h3>
              🎯 Prélèvements
            </h3>

            <div className="harvest-form">

              <select
                value={species}
                onChange={(event) =>
                  setSpecies(
                    event.target.value
                  )
                }
              >
                {SPECIES.map(
                  (item) => (
                    <option
                      key={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    Math.max(
                      1,
                      Number(
                        event.target.value
                      )
                    )
                  )
                }
              />

              <button
                onClick={addHarvest}
              >
                Ajouter
              </button>

            </div>

            {form.harvests.map(
              (item) => (
                <p key={item.species}>
                  🎯 {item.species} ×{" "}
                  {item.quantity}
                </p>
              )
            )}

            <h3>
              🐕 Chiens
            </h3>

            <div className="dog-list">

              {DOGS.map((dog) => (
                <button
                  key={dog}
                  onClick={() =>
                    toggleDog(dog)
                  }
                  className={
                    form.dogs.includes(dog)
                      ? "dog-selected"
                      : ""
                  }
                >
                  🐕 {dog}
                </button>
              ))}

            </div>

            <h3>
              Observations
            </h3>

            <textarea
              rows={4}
              value={form.notes}
              placeholder="Météo, observations..."
              onChange={(event) =>
                setForm({
                  ...form,
                  notes:
                    event.target.value,
                })
              }
            />

            <div className="form-actions">

              <button
                onClick={() =>
                  setShowForm(false)
                }
              >
                Annuler
              </button>

              <button
                className="save-button"
                onClick={saveTrip}
              >
                💾 Enregistrer
              </button>

            </div>

          </section>

        </div>
      )}

    </main>
  );
}

export default App;
