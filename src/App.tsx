import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import { supabase } from "./lib/supabase";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  latitude?: number | null;
  longitude?: number | null;
};

type UserPosition = {
  latitude: number;
  longitude: number;
};

type NamedItem = {
  id: string;
  nom: string;
};

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    territory: "",
    huntType: "Petit gibier",
    harvests: [] as Harvest[],
    dogs: [] as string[],
    notes: "",
    latitude: null as number | null,
    longitude: null as number | null,
  };
}

function MapAutoFit({
  trips,
  userPosition,
}: {
  trips: HuntingTrip[];
  userPosition: UserPosition | null;
}) {
  const map = useMap();

  useEffect(() => {
    const positions: [number, number][] = trips
      .filter(
        (trip) =>
          trip.latitude != null &&
          trip.longitude != null
      )
      .map((trip) => [
        trip.latitude as number,
        trip.longitude as number,
      ]);

    if (userPosition) {
      positions.push([
        userPosition.latitude,
        userPosition.longitude,
      ]);
    }

    if (positions.length === 0) {
      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }

    map.fitBounds(L.latLngBounds(positions), {
      padding: [40, 40],
      maxZoom: 14,
    });
  }, [map, trips, userPosition]);

  return null;
}

function App() {
  const [started, setStarted] = useState(
    localStorage.getItem("carnet-started") === "1"
  );

  const [trips, setTrips] = useState<HuntingTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  const [dogs, setDogs] = useState<NamedItem[]>([]);
  const [speciesList, setSpeciesList] = useState<NamedItem[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [screen, setScreen] = useState<
    "home" | "carnet" | "map" | "stats" | "settings"
  >("home");

  const [showForm, setShowForm] = useState(false);

  const [editingTripId, setEditingTripId] =
    useState<string | null>(null);

  const [form, setForm] = useState(emptyForm());

  const [species, setSpecies] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [locating, setLocating] = useState(false);
  const [locatingOnMap, setLocatingOnMap] = useState(false);

  const [userPosition, setUserPosition] =
    useState<UserPosition | null>(null);

  const [newDogName, setNewDogName] = useState("");
  const [newSpeciesName, setNewSpeciesName] = useState("");

  useEffect(() => {
    loadTrips();
    loadSettings();
  }, []);

  async function loadTrips() {
    setLoadingTrips(true);

    const { data, error } = await supabase
      .from("sorties")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error(error);
      alert(`Erreur chargement : ${error.message}`);
      setLoadingTrips(false);
      return;
    }

    const loadedTrips: HuntingTrip[] = (data || []).map(
      (row) => ({
        id: row.id,
        date: row.date,
        territory: row.territoire,
        huntType: row.type_chasse,
        harvests: row.prelevements || [],
        dogs: row.chiens || [],
        notes: row.observations || "",
        latitude: row.latitude,
        longitude: row.longitude,
      })
    );

    setTrips(loadedTrips);
    setLoadingTrips(false);
  }

  async function loadSettings() {
    setLoadingSettings(true);

    const [
      { data: dogsData, error: dogsError },
      { data: speciesData, error: speciesError },
    ] = await Promise.all([
      supabase
        .from("chiens")
        .select("*")
        .order("nom", { ascending: true }),

      supabase
        .from("especes")
        .select("*")
        .order("nom", { ascending: true }),
    ]);

    if (dogsError) {
      console.error(dogsError);
      alert(`Erreur chiens : ${dogsError.message}`);
    }

    if (speciesError) {
      console.error(speciesError);
      alert(`Erreur espèces : ${speciesError.message}`);
    }

    const loadedDogs: NamedItem[] = dogsData || [];
    const loadedSpecies: NamedItem[] = speciesData || [];

    setDogs(loadedDogs);
    setSpeciesList(loadedSpecies);

    if (!species && loadedSpecies.length > 0) {
      setSpecies(loadedSpecies[0].nom);
    }

    setLoadingSettings(false);
  }

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

  const harvestStats = useMemo(() => {
    const stats: Record<string, number> = {};

    trips.forEach((trip) => {
      trip.harvests.forEach((harvest) => {
        stats[harvest.species] =
          (stats[harvest.species] || 0) +
          harvest.quantity;
      });
    });

    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [trips]);

  const dogStats = useMemo(() => {
    const stats: Record<string, number> = {};

    trips.forEach((trip) => {
      trip.dogs.forEach((dog) => {
        stats[dog] =
          (stats[dog] || 0) + 1;
      });
    });

    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [trips]);

  const territoryStats = useMemo(() => {
    const stats: Record<string, number> = {};

    trips.forEach((trip) => {
      const territory = trip.territory.trim();

      if (territory) {
        stats[territory] =
          (stats[territory] || 0) + 1;
      }
    });

    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [trips]);

  const huntTypeStats = useMemo(() => {
    const stats: Record<string, number> = {};

    trips.forEach((trip) => {
      stats[trip.huntType] =
        (stats[trip.huntType] || 0) + 1;
    });

    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [trips]);

  const geolocatedTrips = useMemo(() => {
    return trips.filter(
      (trip) =>
        trip.latitude != null &&
        trip.longitude != null
    );
  }, [trips]);

  const favoriteSpecies = harvestStats[0] || null;
  const favoriteDog = dogStats[0] || null;
  const favoriteTerritory = territoryStats[0] || null;

  function startApp() {
    setStarted(true);
    localStorage.setItem("carnet-started", "1");
  }

  function newTrip() {
    setEditingTripId(null);
    setForm(emptyForm());

    if (speciesList.length > 0) {
      setSpecies(speciesList[0].nom);
    } else {
      setSpecies("");
    }

    setQuantity(1);
    setShowForm(true);
  }

  function editTrip(trip: HuntingTrip) {
    setEditingTripId(trip.id);

    setForm({
      date: trip.date,
      territory: trip.territory,
      huntType: trip.huntType,
      harvests: [...trip.harvests],
      dogs: [...trip.dogs],
      notes: trip.notes,
      latitude: trip.latitude ?? null,
      longitude: trip.longitude ?? null,
    });

    if (speciesList.length > 0) {
      setSpecies(speciesList[0].nom);
    } else {
      setSpecies("");
    }

    setQuantity(1);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTripId(null);
    setForm(emptyForm());
  }

  function addHarvest() {
    if (!species) {
      alert("Ajoutez d'abord une espèce dans les réglages.");
      return;
    }

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
                  quantity: item.quantity + quantity,
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

  function removeHarvest(speciesToRemove: string) {
    setForm((current) => ({
      ...current,
      harvests: current.harvests.filter(
        (item) => item.species !== speciesToRemove
      ),
    }));
  }

  function toggleDog(dog: string) {
    setForm((current) => ({
      ...current,
      dogs: current.dogs.includes(dog)
        ? current.dogs.filter((item) => item !== dog)
        : [...current.dogs, dog],
    }));
  }

  function useMyPosition() {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas disponible.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));

        setLocating(false);
      },
      (error) => {
        console.error(error);
        setLocating(false);
        alert("Impossible d'obtenir votre position.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function findMeOnMap() {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas disponible.");
      return;
    }

    setLocatingOnMap(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setLocatingOnMap(false);
      },
      (error) => {
        console.error(error);
        setLocatingOnMap(false);
        alert("Impossible d'obtenir votre position.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function removePosition() {
    setForm((current) => ({
      ...current,
      latitude: null,
      longitude: null,
    }));
  }

  async function addDog() {
    const name = newDogName.trim();

    if (!name) {
      alert("Indique le nom du chien.");
      return;
    }

    const { data, error } = await supabase
      .from("chiens")
      .insert({
        nom: name,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        alert("Ce chien existe déjà.");
      } else {
        alert(`Erreur ajout chien : ${error.message}`);
      }

      return;
    }

    setDogs((current) =>
      [...current, data].sort((a, b) =>
        a.nom.localeCompare(b.nom, "fr")
      )
    );

    setNewDogName("");
  }

  async function deleteDog(item: NamedItem) {
    const confirmed = window.confirm(
      `Supprimer le chien "${item.nom}" ?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("chiens")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(`Erreur suppression chien : ${error.message}`);
      return;
    }

    setDogs((current) =>
      current.filter((dog) => dog.id !== item.id)
    );

    setForm((current) => ({
      ...current,
      dogs: current.dogs.filter(
        (dog) => dog !== item.nom
      ),
    }));
  }

  async function addSpecies() {
    const name = newSpeciesName.trim();

    if (!name) {
      alert("Indique le nom de l'espèce.");
      return;
    }

    const { data, error } = await supabase
      .from("especes")
      .insert({
        nom: name,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        alert("Cette espèce existe déjà.");
      } else {
        alert(`Erreur ajout espèce : ${error.message}`);
      }

      return;
    }

    const nextSpecies = [...speciesList, data].sort(
      (a, b) => a.nom.localeCompare(b.nom, "fr")
    );

    setSpeciesList(nextSpecies);

    if (!species) {
      setSpecies(data.nom);
    }

    setNewSpeciesName("");
  }

  async function deleteSpecies(item: NamedItem) {
    const usedInTrips = trips.some((trip) =>
      trip.harvests.some(
        (harvest) => harvest.species === item.nom
      )
    );

    if (usedInTrips) {
      const confirmed = window.confirm(
        `L'espèce "${item.nom}" est déjà présente dans une ou plusieurs sorties.\n\nLa supprimer des réglages ne supprimera pas les anciennes données.\n\nContinuer ?`
      );

      if (!confirmed) {
        return;
      }
    } else {
      const confirmed = window.confirm(
        `Supprimer l'espèce "${item.nom}" ?`
      );

      if (!confirmed) {
        return;
      }
    }

    const { error } = await supabase
      .from("especes")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(`Erreur suppression espèce : ${error.message}`);
      return;
    }

    const remaining = speciesList.filter(
      (current) => current.id !== item.id
    );

    setSpeciesList(remaining);

    if (species === item.nom) {
      setSpecies(
        remaining.length > 0
          ? remaining[0].nom
          : ""
      );
    }
  }

  async function saveTrip() {
    if (!form.territory.trim()) {
      alert("Indique le territoire.");
      return;
    }

    if (editingTripId) {
      const { error } = await supabase
        .from("sorties")
        .update({
          date: form.date,
          territoire: form.territory.trim(),
          type_chasse: form.huntType,
          prelevements: form.harvests,
          chiens: form.dogs,
          observations: form.notes,
          latitude: form.latitude,
          longitude: form.longitude,
        })
        .eq("id", editingTripId);

      if (error) {
        alert(`Erreur modification : ${error.message}`);
        return;
      }

      setTrips((current) =>
        current.map((trip) =>
          trip.id === editingTripId
            ? {
                id: editingTripId,
                ...form,
                territory: form.territory.trim(),
              }
            : trip
        )
      );

      closeForm();
      setScreen("carnet");
      return;
    }

    const trip: HuntingTrip = {
      ...form,
      id: crypto.randomUUID(),
      territory: form.territory.trim(),
    };

    const { error } = await supabase
      .from("sorties")
      .insert({
        id: trip.id,
        date: trip.date,
        territoire: trip.territory,
        type_chasse: trip.huntType,
        prelevements: trip.harvests,
        chiens: trip.dogs,
        observations: trip.notes,
        latitude: trip.latitude,
        longitude: trip.longitude,
      });

    if (error) {
      alert(`Erreur enregistrement : ${error.message}`);
      return;
    }

    setTrips((current) => [trip, ...current]);

    closeForm();
    setScreen("carnet");
  }

  async function deleteTrip(id: string) {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette sortie ?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("sorties")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Erreur suppression : ${error.message}`);
      return;
    }

    setTrips((current) =>
      current.filter((trip) => trip.id !== id)
    );
  }

  if (!started) {
    return (
      <main className="app">
        <section className="welcome-card">
          <div className="logo">
  <img
    src="/icon-512.png"
    alt="Carnet-de-Chasse"
  />
</div>

          <h1>
            Carnet-de-Chasse
          </h1>

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

          <button
            className="profile-button"
            onClick={() =>
              setScreen("settings")
            }
            title="Réglages"
          >
            ⚙️
          </button>
        </header>

        <section className="screen-content">
          {screen === "home" && (
  <>
    {/* SAISON */}
    <section className="season-card">
      <div>
        <span>Saison actuelle</span>
        <strong>2026 — 2027</strong>
      </div>

      <span>🦌</span>
    </section>

    {/* ACTION PRINCIPALE */}
    <section className="home-hero">
      <div className="home-hero-icon">🌲</div>

      <div>
        <small>Mon carnet</small>
        <h2>Prêt pour une nouvelle sortie ?</h2>
        <p>
          Enregistre ta journée, tes chiens,
          tes prélèvements et ta position.
        </p>
      </div>

      <button
        className="home-new-trip"
        onClick={newTrip}
      >
        <span>＋</span>
        Nouvelle sortie
      </button>
    </section>

    {/* RÉSUMÉ */}
    <div className="home-section-title">
      <h2>Ma saison</h2>

      <button onClick={() => setScreen("stats")}>
        Voir les stats →
      </button>
    </div>

    <div className="stats-grid">
      <div className="stat-card">
        <span>📖</span>
        <strong>{trips.length}</strong>
        <small>Sorties</small>
      </div>

      <div className="stat-card">
        <span>🎯</span>
        <strong>{totalHarvests}</strong>
        <small>Prélèvements</small>
      </div>

      <div className="stat-card">
        <span>🐕</span>
        <strong>
          {favoriteDog?.name || "—"}
        </strong>
        <small>Chien le + utilisé</small>
      </div>

      <div className="stat-card">
        <span>📍</span>
        <strong>
          {favoriteTerritory?.name || "—"}
        </strong>
        <small>Territoire favori</small>
      </div>
    </div>

    {/* DERNIÈRE SORTIE */}
    <div className="home-section-title">
      <h2>Dernière sortie</h2>

      {trips.length > 0 && (
        <button onClick={() => setScreen("carnet")}>
          Voir le carnet →
        </button>
      )}
    </div>

    {trips.length === 0 ? (
      <section className="last-trip-card empty">
        <div className="last-trip-icon">
          🌿
        </div>

        <div>
          <strong>Aucune sortie enregistrée</strong>

          <p>
            Ta prochaine journée de chasse
            apparaîtra ici.
          </p>
        </div>
      </section>
    ) : (
      <section className="last-trip-card">
        <div className="last-trip-top">
          <div className="last-trip-date">
            <span>📅</span>

            <div>
              <small>Dernière sortie</small>

              <strong>
                {new Date(
                  trips[0].date + "T12:00:00"
                ).toLocaleDateString(
                  "fr-FR",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </strong>
            </div>
          </div>

          <button
            className="last-trip-edit"
            onClick={() => editTrip(trips[0])}
          >
            ✏️
          </button>
        </div>

        <div className="last-trip-details">
          <div>
            <span>📍</span>

            <div>
              <small>Territoire</small>
              <strong>
                {trips[0].territory}
              </strong>
            </div>
          </div>

          <div>
            <span>🏹</span>

            <div>
              <small>Type de chasse</small>
              <strong>
                {trips[0].huntType}
              </strong>
            </div>
          </div>
        </div>

        <div className="last-trip-harvest">
          <small>🎯 Prélèvements</small>

          {trips[0].harvests.length > 0 ? (
            <div className="harvest-tags">
              {trips[0].harvests.map((item) => (
                <span key={item.species}>
                  {item.species}
                  <strong> ×{item.quantity}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p>Aucun prélèvement</p>
          )}
        </div>

        {trips[0].dogs.length > 0 && (
          <div className="last-trip-dogs">
            <small>🐕 Chiens</small>

            <p>
              {trips[0].dogs.join(" • ")}
            </p>
          </div>
        )}

        <button
          className="last-trip-open"
          onClick={() => setScreen("carnet")}
        >
          Ouvrir mon carnet
          <span>→</span>
        </button>
      </section>
    )}

    {/* ACCÈS RAPIDES */}
    <h2 className="quick-title">
      Accès rapides
    </h2>

    <div className="quick-grid">
      <button
        onClick={() => setScreen("carnet")}
      >
        <span>📖</span>

        <div>
          <strong>Mon carnet</strong>
          <small>Mes sorties</small>
        </div>
      </button>

      <button
        onClick={() => setScreen("map")}
      >
        <span>🗺️</span>

        <div>
          <strong>Ma carte</strong>
          <small>Mes positions</small>
        </div>
      </button>

      <button
        onClick={() => setScreen("stats")}
      >
        <span>📊</span>

        <div>
          <strong>Statistiques</strong>
          <small>Ma saison</small>
        </div>
      </button>

      <button
        onClick={() => setScreen("settings")}
      >
        <span>⚙️</span>

        <div>
          <strong>Réglages</strong>
          <small>Chiens & espèces</small>
        </div>
      </button>
    </div>
  </>
)}

          {screen === "carnet" && (
            <>
              <div className="page-title">
                <h2>
                  Mon carnet
                </h2>

                <button
                  className="action-button"
                  onClick={newTrip}
                >
                  ＋ Ajouter
                </button>
              </div>

              {loadingTrips ? (
                <div className="stat-card">
                  <strong>
                    Chargement...
                  </strong>
                </div>
              ) : trips.length === 0 ? (
                <div className="stat-card">
                  <strong>
                    Aucune sortie
                  </strong>

                  <small>
                    Enregistrez votre première journée de chasse.
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
                        trip.date + "T12:00:00"
                      ).toLocaleDateString("fr-FR")}
                    </strong>

                    <small>
                      📍 {trip.territory}
                    </small>

                    <small>
                      🏹 {trip.huntType}
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
                        🐕 {trip.dogs.join(", ")}
                      </small>
                    )}

                    {trip.latitude != null &&
                      trip.longitude != null && (
                        <small>
                          📌 Position GPS enregistrée
                        </small>
                      )}

                    {trip.notes && (
                      <small>
                        📝 {trip.notes}
                      </small>
                    )}

                    <div className="form-actions">
                      <button
                        onClick={() =>
                          editTrip(trip)
                        }
                      >
                        ✏️ Modifier
                      </button>

                      <button
                        onClick={() =>
                          deleteTrip(trip.id)
                        }
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </article>
                ))
              )}
            </>
          )}

          {screen === "map" && (
            <>
              <div className="page-title">
                <h2>
                  🗺️ Carte
                </h2>

                <button
                  className="action-button"
                  onClick={findMeOnMap}
                  disabled={locatingOnMap}
                >
                  {locatingOnMap
                    ? "📍 Recherche..."
                    : "📍 Ma position"}
                </button>
              </div>

              <div className="stat-card">
                <strong>
                  {geolocatedTrips.length}
                </strong>

                <small>
                  sortie
                  {geolocatedTrips.length > 1 ? "s" : ""} géolocalisée
                  {geolocatedTrips.length > 1 ? "s" : ""}
                </small>
              </div>

              {geolocatedTrips.length === 0 &&
              !userPosition ? (
                <div className="stat-card">
                  <strong>
                    Aucune position
                  </strong>

                  <small>
                    Ajoutez une position GPS à une sortie.
                  </small>
                </div>
              ) : (
                <div className="map-wrapper">
                  <MapContainer
                    center={[
                      geolocatedTrips[0]?.latitude ??
                        userPosition?.latitude ??
                        46.603354,
                      geolocatedTrips[0]?.longitude ??
                        userPosition?.longitude ??
                        1.888334,
                    ]}
                    zoom={12}
                    style={{
                      height: "100%",
                      width: "100%",
                    }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapAutoFit
                      trips={geolocatedTrips}
                      userPosition={userPosition}
                    />

                    {geolocatedTrips.map((trip) => (
                      <Marker
                        key={trip.id}
                        position={[
                          trip.latitude as number,
                          trip.longitude as number,
                        ]}
                      >
                        <Popup>
                          <strong>
                            📍 {trip.territory}
                          </strong>

                          <p>
                            📅{" "}
                            {new Date(
                              trip.date + "T12:00:00"
                            ).toLocaleDateString("fr-FR")}
                          </p>

                          <p>
                            🏹 {trip.huntType}
                          </p>

                          <p>
                            🎯{" "}
                            {trip.harvests.length
                              ? trip.harvests
                                  .map(
                                    (item) =>
                                      `${item.species} ×${item.quantity}`
                                  )
                                  .join(", ")
                              : "Aucun prélèvement"}
                          </p>

                          {trip.dogs.length > 0 && (
                            <p>
                              🐕 {trip.dogs.join(", ")}
                            </p>
                          )}

                          <button
                            onClick={() =>
                              editTrip(trip)
                            }
                          >
                            ✏️ Modifier
                          </button>
                        </Popup>
                      </Marker>
                    ))}

                    {userPosition && (
                      <CircleMarker
                        center={[
                          userPosition.latitude,
                          userPosition.longitude,
                        ]}
                        radius={10}
                      >
                        <Popup>
                          📍 Ma position actuelle
                        </Popup>
                      </CircleMarker>
                    )}
                  </MapContainer>
                </div>
              )}
            </>
          )}

          {screen === "stats" && (
            <>
              <h2>
                📊 Statistiques
              </h2>

              <section className="season-card">
                <span>
                  Saison actuelle
                </span>

                <strong>
                  2026 — 2027
                </strong>
              </section>

              <h3>
                Vue générale
              </h3>

              <div className="stats-grid">
                <div className="stat-card">
                  <span>
                    📖
                  </span>

                  <strong>
                    {trips.length}
                  </strong>

                  <small>
                    Sorties
                  </small>
                </div>

                <div className="stat-card">
                  <span>
                    🎯
                  </span>

                  <strong>
                    {totalHarvests}
                  </strong>

                  <small>
                    Prélèvements
                  </small>
                </div>

                <div className="stat-card">
                  <span>
                    🐕
                  </span>

                  <strong>
                    {dogStats.length}
                  </strong>

                  <small>
                    Chiens utilisés
                  </small>
                </div>

                <div className="stat-card">
                  <span>
                    📍
                  </span>

                  <strong>
                    {territoryStats.length}
                  </strong>

                  <small>
                    Territoires
                  </small>
                </div>
              </div>

              <h3>
                🏆 Mes favoris
              </h3>

              <div className="stats-grid">
                <div className="stat-card">
                  <span>
                    🦌
                  </span>

                  <strong>
                    {favoriteSpecies?.name || "—"}
                  </strong>

                  <small>
                    Espèce la plus prélevée
                  </small>
                </div>

                <div className="stat-card">
                  <span>
                    🐕
                  </span>

                  <strong>
                    {favoriteDog?.name || "—"}
                  </strong>

                  <small>
                    Chien le plus utilisé
                  </small>
                </div>

                <div className="stat-card">
                  <span>
                    📍
                  </span>

                  <strong>
                    {favoriteTerritory?.name || "—"}
                  </strong>

                  <small>
                    Territoire le plus fréquenté
                  </small>
                </div>
              </div>

              <h3>
                🦌 Prélèvements par espèce
              </h3>

              {harvestStats.map((item, index) => (
                <div
                  className="stat-card"
                  key={item.name}
                >
                  <strong>
                    {index + 1}. {item.name}
                  </strong>

                  <small>
                    🎯 {item.count} prélèvement
                    {item.count > 1 ? "s" : ""}
                  </small>
                </div>
              ))}

              <h3>
                🐕 Sorties par chien
              </h3>

              {dogStats.map((item, index) => (
                <div
                  className="stat-card"
                  key={item.name}
                >
                  <strong>
                    {index + 1}. {item.name}
                  </strong>

                  <small>
                    🐕 {item.count} sortie
                    {item.count > 1 ? "s" : ""}
                  </small>
                </div>
              ))}

              <h3>
                📍 Sorties par territoire
              </h3>

              {territoryStats.map((item, index) => (
                <div
                  className="stat-card"
                  key={item.name}
                >
                  <strong>
                    {index + 1}. {item.name}
                  </strong>

                  <small>
                    📖 {item.count} sortie
                    {item.count > 1 ? "s" : ""}
                  </small>
                </div>
              ))}

              <h3>
                🏹 Types de chasse
              </h3>

              {huntTypeStats.map((item, index) => (
                <div
                  className="stat-card"
                  key={item.name}
                >
                  <strong>
                    {index + 1}. {item.name}
                  </strong>

                  <small>
                    {item.count} sortie
                    {item.count > 1 ? "s" : ""}
                  </small>
                </div>
              ))}
            </>
          )}

          {screen === "settings" && (
            <>
              <h2>
                ⚙️ Réglages
              </h2>

              <div className="stat-card">
                <strong>
                  Gestion de Carnet-de-Chasse
                </strong>

                <small>
                  Personnalisez vos chiens et vos espèces.
                </small>
              </div>

              {loadingSettings ? (
                <div className="stat-card">
                  <strong>
                    Chargement...
                  </strong>
                </div>
              ) : (
                <>
                  <h3>
                    🐕 Mes chiens
                  </h3>

                  <div className="settings-add-row">
                    <input
                      value={newDogName}
                      placeholder="Nom du nouveau chien"
                      onChange={(event) =>
                        setNewDogName(event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="action-button"
                      onClick={addDog}
                    >
                      ＋ Ajouter
                    </button>
                  </div>

                  {dogs.length === 0 ? (
                    <div className="stat-card">
                      <small>
                        Aucun chien enregistré.
                      </small>
                    </div>
                  ) : (
                    dogs.map((dog) => (
                      <div
                        className="settings-item"
                        key={dog.id}
                      >
                        <span>
                          🐕 {dog.nom}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            deleteDog(dog)
                          }
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}

                  <h3>
                    🦌 Mes espèces
                  </h3>

                  <div className="settings-add-row">
                    <input
                      value={newSpeciesName}
                      placeholder="Nom de la nouvelle espèce"
                      onChange={(event) =>
                        setNewSpeciesName(event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="action-button"
                      onClick={addSpecies}
                    >
                      ＋ Ajouter
                    </button>
                  </div>

                  {speciesList.length === 0 ? (
                    <div className="stat-card">
                      <small>
                        Aucune espèce enregistrée.
                      </small>
                    </div>
                  ) : (
                    speciesList.map((item) => (
                      <div
                        className="settings-item"
                        key={item.id}
                      >
                        <span>
                          🦌 {item.nom}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            deleteSpecies(item)
                          }
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </section>

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
              setScreen("map")
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
              {editingTripId
                ? "Modifier la sortie"
                : "Nouvelle sortie"}
            </h2>

            <label>
              Date

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
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
                    territory: event.target.value,
                  })
                }
              />
            </label>

            <h3>
              📍 Localisation
            </h3>

            <div className="form-actions">
              <button
                type="button"
                onClick={useMyPosition}
                disabled={locating}
              >
                {locating
                  ? "📍 Recherche..."
                  : "📍 Utiliser ma position"}
              </button>

              {form.latitude != null &&
                form.longitude != null && (
                  <button
                    type="button"
                    onClick={removePosition}
                  >
                    ✕ Supprimer GPS
                  </button>
                )}
            </div>

            {form.latitude != null &&
              form.longitude != null && (
                <div className="stat-card">
                  <strong>
                    Position enregistrée
                  </strong>

                  <small>
                    Latitude :{" "}
                    {form.latitude.toFixed(6)}
                  </small>

                  <small>
                    Longitude :{" "}
                    {form.longitude.toFixed(6)}
                  </small>
                </div>
              )}

            <label>
              Type de chasse

              <select
                value={form.huntType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    huntType: event.target.value,
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

            {speciesList.length === 0 ? (
              <div className="stat-card">
                <small>
                  Aucune espèce disponible. Ajoutez-en une dans ⚙️ Réglages.
                </small>
              </div>
            ) : (
              <div className="harvest-form">
                <select
                  value={species}
                  onChange={(event) =>
                    setSpecies(event.target.value)
                  }
                >
                  {speciesList.map((item) => (
                    <option
                      key={item.id}
                      value={item.nom}
                    >
                      {item.nom}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      Math.max(
                        1,
                        Number(event.target.value)
                      )
                    )
                  }
                />

                <button
                  type="button"
                  onClick={addHarvest}
                >
                  Ajouter
                </button>
              </div>
            )}

            {form.harvests.map((item) => (
              <div
                className="form-actions"
                key={item.species}
              >
                <p>
                  🎯 {item.species} × {item.quantity}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    removeHarvest(item.species)
                  }
                >
                  ✕
                </button>
              </div>
            ))}

            <h3>
              🐕 Chiens
            </h3>

            {dogs.length === 0 ? (
              <div className="stat-card">
                <small>
                  Aucun chien disponible. Ajoutez-en un dans ⚙️ Réglages.
                </small>
              </div>
            ) : (
              <div className="dog-list">
                {dogs.map((dog) => (
                  <button
                    type="button"
                    key={dog.id}
                    onClick={() =>
                      toggleDog(dog.nom)
                    }
                    className={
                      form.dogs.includes(dog.nom)
                        ? "dog-selected"
                        : ""
                    }
                  >
                    🐕 {dog.nom}
                  </button>
                ))}
              </div>
            )}

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
                  notes: event.target.value,
                })
              }
            />

            <div className="form-actions">
              <button
                type="button"
                onClick={closeForm}
              >
                Annuler
              </button>

              <button
                type="button"
                className="save-button"
                onClick={saveTrip}
              >
                💾{" "}
                {editingTripId
                  ? "Enregistrer les modifications"
                  : "Enregistrer"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;