import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Crosshair,
  Dog,
  Home,
  Map as MapIcon,
  MapPin,
  NotebookText,
  Pencil,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Target,
  Trash2,
  TreePine,
  X,
} from "lucide-react";

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


/* =========================================================
   TYPES
   ========================================================= */

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

type Screen =
  | "home"
  | "carnet"
  | "map"
  | "stats"
  | "settings";

type TripForm = {
  date: string;
  territory: string;
  huntType: string;
  harvests: Harvest[];
  dogs: string[];
  notes: string;
  latitude: number | null;
  longitude: number | null;
};


/* =========================================================
   LEAFLET
   ========================================================= */

const huntingTripIcon = L.divIcon({
  className: "hunting-map-custom-marker",
  html: `
    <div class="hunting-map-custom-marker-pin">
      <svg
        viewBox="0 0 24 24"
        width="21"
        height="21"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22v-7" />
        <path d="m7 11 5-8 5 8" />
        <path d="m5 15 7-10 7 10" />
      </svg>
    </div>
  `,
  iconSize: [46, 50],
  iconAnchor: [23, 47],
  popupAnchor: [0, -44],
});


function MapAutoFit({
  trips,
  userPosition,
}: {
  trips: HuntingTrip[];
  userPosition: UserPosition | null;
}) {
  const map = useMap();

  useEffect(() => {
    const positions: [number, number][] =
      trips
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

    map.fitBounds(
      L.latLngBounds(positions),
      {
        padding: [40, 40],
        maxZoom: 14,
      }
    );
  }, [map, trips, userPosition]);

  return null;
}


/* =========================================================
   APPLICATION
   ========================================================= */

export default function App() {
  const [started, setStarted] =
    useState<boolean>(() => {
      return (
        localStorage.getItem(
          "carnet-started"
        ) === "true"
      );
    });

  const [screen, setScreen] =
    useState<Screen>("home");

  const [trips, setTrips] =
    useState<HuntingTrip[]>([]);

  const [loadingTrips, setLoadingTrips] =
    useState(true);

  const [dogs, setDogs] =
    useState<NamedItem[]>([]);

  const [speciesList, setSpeciesList] =
    useState<NamedItem[]>([]);

  const [
    loadingSettings,
    setLoadingSettings,
  ] = useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingTripId,
    setEditingTripId,
  ] = useState<string | null>(null);

  const [species, setSpecies] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [locating, setLocating] =
    useState(false);

  const [
    locatingOnMap,
    setLocatingOnMap,
  ] = useState(false);

  const [
    userPosition,
    setUserPosition,
  ] = useState<UserPosition | null>(
    null
  );

  const [
    newDogName,
    setNewDogName,
  ] = useState("");

  const [
    newSpeciesName,
    setNewSpeciesName,
  ] = useState("");

  /* Recherche carnet */

  const [
    tripSearch,
    setTripSearch,
  ] = useState("");

  const [
    huntTypeFilter,
    setHuntTypeFilter,
  ] = useState("Tous");


  /* =========================================================
     FORMULAIRE
     ========================================================= */

  const emptyForm = (): TripForm => ({
    date: new Date()
      .toISOString()
      .split("T")[0],

    territory: "",
    huntType: "Battue",

    harvests: [],

    dogs: [],

    notes: "",

    latitude: null,
    longitude: null,
  });

  const [form, setForm] =
    useState<TripForm>(
      emptyForm()
    );


  /* =========================================================
     CHARGEMENT
     ========================================================= */

  useEffect(() => {
    loadTrips();
    loadSettings();
  }, []);


  async function loadTrips() {
    setLoadingTrips(true);

    const {
      data,
      error,
    } = await supabase
      .from("sorties")
      .select("*")
      .order("date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Erreur chargement sorties :",
        error
      );

      setLoadingTrips(false);
      return;
    }

    const formatted: HuntingTrip[] =
      (data || []).map(
        (item: any) => ({
          id: item.id,

          date: item.date,

          territory:
            item.territoire || "",

          huntType:
            item.type_chasse || "",

          harvests:
            item.prelevements || [],

          dogs:
            item.chiens || [],

          notes:
            item.observations || "",

          latitude:
            item.latitude,

          longitude:
            item.longitude,
        })
      );

    setTrips(formatted);

    setLoadingTrips(false);
  }


  async function loadSettings() {
    setLoadingSettings(true);

    const [
      dogsResult,
      speciesResult,
    ] = await Promise.all([
      supabase
        .from("chiens")
        .select("*")
        .order("nom"),

      supabase
        .from("especes")
        .select("*")
        .order("nom"),
    ]);

    if (!dogsResult.error) {
      setDogs(
        dogsResult.data || []
      );
    }

    if (!speciesResult.error) {
      setSpeciesList(
        speciesResult.data || []
      );
    }

    setLoadingSettings(false);
  }


  /* =========================================================
     STATISTIQUES
     ========================================================= */

  const totalHarvests =
    useMemo(() => {
      return trips.reduce(
        (total, trip) =>
          total +
          trip.harvests.reduce(
            (sum, harvest) =>
              sum +
              Number(
                harvest.quantity || 0
              ),
            0
          ),
        0
      );
    }, [trips]);


  const favoriteDog =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      trips.forEach((trip) => {
        trip.dogs.forEach(
          (dog) => {
            counts[dog] =
              (counts[dog] || 0) + 1;
          }
        );
      });

      const winner =
        Object.entries(counts).sort(
          (a, b) => b[1] - a[1]
        )[0];

      if (!winner) {
        return null;
      }

      return {
        name: winner[0],
        count: winner[1],
      };
    }, [trips]);


  const favoriteTerritory =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      trips.forEach((trip) => {
        if (!trip.territory) {
          return;
        }

        counts[trip.territory] =
          (counts[
            trip.territory
          ] || 0) + 1;
      });

      const winner =
        Object.entries(counts).sort(
          (a, b) => b[1] - a[1]
        )[0];

      if (!winner) {
        return null;
      }

      return {
        name: winner[0],
        count: winner[1],
      };
    }, [trips]);


  const favoriteSpecies =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      trips.forEach((trip) => {
        trip.harvests.forEach(
          (harvest) => {
            counts[
              harvest.species
            ] =
              (counts[
                harvest.species
              ] || 0) +
              Number(
                harvest.quantity
              );
          }
        );
      });

      const winner =
        Object.entries(counts).sort(
          (a, b) => b[1] - a[1]
        )[0];

      if (!winner) {
        return null;
      }

      return {
        name: winner[0],
        count: winner[1],
      };
    }, [trips]);


  const speciesStats =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      trips.forEach((trip) => {
        trip.harvests.forEach(
          (harvest) => {
            counts[
              harvest.species
            ] =
              (counts[
                harvest.species
              ] || 0) +
              Number(
                harvest.quantity
              );
          }
        );
      });

      return Object.entries(counts)
        .map(
          ([name, count]) => ({
            name,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        );
    }, [trips]);


  const dogStats =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      trips.forEach((trip) => {
        trip.dogs.forEach(
          (dog) => {
            counts[dog] =
              (counts[dog] || 0) + 1;
          }
        );
      });

      return Object.entries(counts)
        .map(
          ([name, count]) => ({
            name,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        );
    }, [trips]);


  const territoryStats =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      trips.forEach((trip) => {
        if (!trip.territory) {
          return;
        }

        counts[trip.territory] =
          (counts[
            trip.territory
          ] || 0) + 1;
      });

      return Object.entries(counts)
        .map(
          ([name, count]) => ({
            name,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        );
    }, [trips]);


  const huntTypeStats =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      trips.forEach((trip) => {
        if (!trip.huntType) {
          return;
        }

        counts[trip.huntType] =
          (counts[
            trip.huntType
          ] || 0) + 1;
      });

      return Object.entries(counts)
        .map(
          ([name, count]) => ({
            name,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        );
    }, [trips]);


  const filteredTrips =
    useMemo(() => {
      const search =
        tripSearch
          .trim()
          .toLowerCase();

      return trips.filter(
        (trip) => {
          const matchesType =
            huntTypeFilter ===
              "Tous" ||
            trip.huntType ===
              huntTypeFilter;

          const searchableText =
            [
              trip.territory,
              trip.huntType,
              trip.notes,

              ...trip.dogs,

              ...trip.harvests.map(
                (harvest) =>
                  harvest.species
              ),
            ]
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !search ||
            searchableText.includes(
              search
            );

          return (
            matchesType &&
            matchesSearch
          );
        }
      );
    }, [
      trips,
      tripSearch,
      huntTypeFilter,
    ]);


  /* =========================================================
     NAVIGATION / FORMULAIRE
     ========================================================= */

  function startApp() {
    localStorage.setItem(
      "carnet-started",
      "true"
    );

    setStarted(true);
  }


  function newTrip() {
    setEditingTripId(null);

    setForm(
      emptyForm()
    );

    setSpecies("");
    setQuantity(1);

    setShowForm(true);
  }


  function editTrip(
    trip: HuntingTrip
  ) {
    setEditingTripId(trip.id);

    setForm({
      date: trip.date,

      territory:
        trip.territory,

      huntType:
        trip.huntType,

      harvests:
        [...trip.harvests],

      dogs:
        [...trip.dogs],

      notes:
        trip.notes,

      latitude:
        trip.latitude ??
        null,

      longitude:
        trip.longitude ??
        null,
    });

    setSpecies("");
    setQuantity(1);

    setShowForm(true);
  }


  function closeForm() {
    setShowForm(false);

    setEditingTripId(null);
  }


  /* =========================================================
     PRÉLÈVEMENTS
     ========================================================= */

  function addHarvest() {
    if (!species) {
      return;
    }

    const amount =
      Math.max(
        1,
        Number(quantity)
      );

    const existing =
      form.harvests.find(
        (item) =>
          item.species === species
      );

    if (existing) {
      setForm({
        ...form,

        harvests:
          form.harvests.map(
            (item) =>
              item.species ===
              species
                ? {
                    ...item,

                    quantity:
                      item.quantity +
                      amount,
                  }
                : item
          ),
      });
    } else {
      setForm({
        ...form,

        harvests: [
          ...form.harvests,

          {
            species,
            quantity: amount,
          },
        ],
      });
    }

    setSpecies("");
    setQuantity(1);
  }


  function removeHarvest(
    speciesName: string
  ) {
    setForm({
      ...form,

      harvests:
        form.harvests.filter(
          (item) =>
            item.species !==
            speciesName
        ),
    });
  }


  /* =========================================================
     SÉLECTION DES CHIENS DANS UNE SORTIE
     ========================================================= */

  function toggleDog(
    dogName: string
  ) {
    setForm((current) => ({
      ...current,

      dogs: current.dogs.includes(
        dogName
      )
        ? current.dogs.filter(
            (dog) =>
              dog !== dogName
          )
        : [
            ...current.dogs,
            dogName,
          ],
    }));
  }


  /* =========================================================
     GPS
     ========================================================= */

  function useMyPosition() {
    if (
      !navigator.geolocation
    ) {
      alert(
        "La géolocalisation n'est pas disponible sur cet appareil."
      );

      return;
    }

    setLocating(true);

    navigator.geolocation
      .getCurrentPosition(
        (position) => {
          setForm({
            ...form,

            latitude:
              position.coords
                .latitude,

            longitude:
              position.coords
                .longitude,
          });

          setLocating(false);
        },

        (error) => {
          console.error(
            error
          );

          alert(
            "Impossible de récupérer ta position."
          );

          setLocating(false);
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
  }


  function removePosition() {
    setForm({
      ...form,

      latitude: null,
      longitude: null,
    });
  }


  function findMeOnMap() {
    if (
      !navigator.geolocation
    ) {
      alert(
        "La géolocalisation n'est pas disponible."
      );

      return;
    }

    setLocatingOnMap(true);

    navigator.geolocation
      .getCurrentPosition(
        (position) => {
          setUserPosition({
            latitude:
              position.coords
                .latitude,

            longitude:
              position.coords
                .longitude,
          });

          setLocatingOnMap(false);
        },

        () => {
          alert(
            "Impossible de récupérer ta position."
          );

          setLocatingOnMap(false);
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
        }
      );
  }


  /* =========================================================
     SUPABASE SORTIES
     ========================================================= */

  async function saveTrip() {
    if (!form.date) {
      alert(
        "Indique la date de la sortie."
      );

      return;
    }

    if (
      !form.territory.trim()
    ) {
      alert(
        "Indique le territoire."
      );

      return;
    }

    if (
      !form.huntType.trim()
    ) {
      alert(
        "Indique le type de chasse."
      );

      return;
    }

    const payload = {
      date: form.date,

      territoire:
        form.territory.trim(),

      type_chasse:
        form.huntType.trim(),

      prelevements:
        form.harvests,

      chiens:
        form.dogs,

      observations:
        form.notes.trim(),

      latitude:
        form.latitude,

      longitude:
        form.longitude,
    };


    if (editingTripId) {
      const {
        error,
      } = await supabase
        .from("sorties")
        .update(payload)
        .eq(
          "id",
          editingTripId
        );

      if (error) {
        console.error(
          error
        );

        alert(
          "Erreur lors de la modification."
        );

        return;
      }
    } else {
      const {
        error,
      } = await supabase
        .from("sorties")
        .insert({
          id:
            crypto.randomUUID(),

          ...payload,
        });

      if (error) {
        console.error(
          error
        );

        alert(
          "Erreur lors de l'enregistrement."
        );

        return;
      }
    }

    closeForm();

    await loadTrips();
  }


  async function deleteTrip(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Supprimer cette sortie ?"
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("sorties")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        error
      );

      alert(
        "Impossible de supprimer la sortie."
      );

      return;
    }

    await loadTrips();
  }


  /* =========================================================
     RÉGLAGES CHIENS / ESPÈCES
     ========================================================= */

  async function addDog() {
    const name =
      newDogName.trim();

    if (!name) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("chiens")
      .insert({
        nom: name,
      });

    if (error) {
      console.error(
        error
      );

      alert(
        "Impossible d'ajouter ce chien."
      );

      return;
    }

    setNewDogName("");

    await loadSettings();
  }


  async function deleteDog(
    dog: NamedItem
  ) {
    const confirmed =
      window.confirm(
        `Supprimer ${dog.nom} de la liste des chiens ?`
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("chiens")
      .delete()
      .eq(
        "id",
        dog.id
      );

    if (error) {
      console.error(
        error
      );

      alert(
        "Impossible de supprimer ce chien."
      );

      return;
    }

    setForm((current) => ({
      ...current,

      dogs:
        current.dogs.filter(
          (name) =>
            name !== dog.nom
        ),
    }));

    await loadSettings();
  }


  async function addSpecies() {
    const name =
      newSpeciesName.trim();

    if (!name) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("especes")
      .insert({
        nom: name,
      });

    if (error) {
      console.error(
        error
      );

      alert(
        "Impossible d'ajouter cette espèce."
      );

      return;
    }

    setNewSpeciesName("");

    await loadSettings();
  }


  async function deleteSpecies(
    item: NamedItem
  ) {
    const confirmed =
      window.confirm(
        `Supprimer ${item.nom} de la liste ?\n\nLes anciennes sorties utilisant cette espèce resteront enregistrées.`
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("especes")
      .delete()
      .eq(
        "id",
        item.id
      );

    if (error) {
      console.error(
        error
      );

      alert(
        "Impossible de supprimer cette espèce."
      );

      return;
    }

    await loadSettings();
  }


  /* =========================================================
     ÉCRAN BIENVENUE
     ========================================================= */

  if (!started) {
    return (
      <main className="welcome-screen">
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
            Enregistre tes journées,
            tes chiens,
            tes prélèvements et
            retrouve toute ta saison
            dans ton carnet.
          </p>

          <button
            type="button"
            onClick={startApp}
          >
            Commencer
          </button>
        </section>
      </main>
    );
  }


  /* =========================================================
     APPLICATION
     ========================================================= */

  return (
    <main className="app">
      <section className="dashboard">

        {/* HEADER */}

        <header className="header">
          <div className="header-brand">
            <img
              src="/icon-192.png"
              alt=""
            />

            <div>
              <small>
                Carnet
              </small>

              <strong>
                de Chasse
              </strong>
            </div>
          </div>

          <button
            className="profile-button"
            type="button"
            onClick={() =>
              setScreen(
                "settings"
              )
            }
            title="Réglages"
          >
            <Settings
              size={24}
              strokeWidth={1.7}
            />
          </button>
        </header>


        <section className="screen-content">

          {/* =================================================
              ACCUEIL
              ================================================= */}

          {screen === "home" && (
            <>

              {/* SAISON */}

              <section className="new-season-card">
                <div className="new-season-icon">
                  <CalendarDays
                    size={27}
                    strokeWidth={1.8}
                  />
                </div>

                <div className="new-season-text">
                  <span>
                    SAISON ACTUELLE
                  </span>

                  <strong>
                    2026 — 2027
                  </strong>
                </div>

                <TreePine
                  className="new-season-tree tree-one"
                  size={92}
                  strokeWidth={1}
                />

                <TreePine
                  className="new-season-tree tree-two"
                  size={70}
                  strokeWidth={1}
                />
              </section>


              {/* NOUVELLE SORTIE */}

              <section className="new-trip-hero">
                <div className="hero-top">

                  <div className="hero-illustration">
                    <TreePine
                      size={43}
                      strokeWidth={1.5}
                    />

                    <Dog
                      size={34}
                      strokeWidth={1.5}
                    />
                  </div>

                  <div className="hero-copy">
                    <h2>
                      Prêt pour une
                      <br />
                      nouvelle sortie ?
                    </h2>

                    <p>
                      Enregistre ta journée,
                      tes chiens,
                      tes prélèvements et
                      ta position.
                    </p>
                  </div>
                </div>

                <button
                  className="new-trip-main-button"
                  type="button"
                  onClick={newTrip}
                >
                  <span className="new-trip-plus">
                    <Plus
                      size={25}
                      strokeWidth={2.2}
                    />
                  </span>

                  Nouvelle sortie
                </button>
              </section>


              {/* MA SAISON */}

              <div className="new-section-heading">
                <h2>
                  MA SAISON
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "stats"
                    )
                  }
                >
                  Voir les stats

                  <ChevronRight
                    size={17}
                  />
                </button>
              </div>


              <section className="new-season-stats">

                <div className="new-stat-box">
                  <div className="new-stat-icon">
                    <NotebookText
                      size={23}
                    />
                  </div>

                  <strong>
                    {trips.length}
                  </strong>

                  <span>
                    Sorties
                  </span>
                </div>


                <div className="new-stat-box">
                  <div className="new-stat-icon brown">
                    <Target
                      size={23}
                    />
                  </div>

                  <strong>
                    {totalHarvests}
                  </strong>

                  <span>
                    Prélèvements
                  </span>
                </div>


                <div className="new-stat-box">
                  <div className="new-stat-icon">
                    <Dog
                      size={23}
                    />
                  </div>

                  <strong className="new-stat-word">
                    {favoriteDog
                      ?.name ||
                      "—"}
                  </strong>

                  <span>
                    Chien le + utilisé
                  </span>
                </div>


                <div className="new-stat-box">
                  <div className="new-stat-icon brown">
                    <MapPin
                      size={23}
                    />
                  </div>

                  <strong className="new-stat-word">
                    {favoriteTerritory
                      ?.name ||
                      "—"}
                  </strong>

                  <span>
                    Territoire favori
                  </span>
                </div>
              </section>


              {/* DERNIÈRE SORTIE */}

              <div className="new-section-heading">
                <h2>
                  DERNIÈRE SORTIE
                </h2>

                {trips.length >
                  0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setScreen(
                        "carnet"
                      )
                    }
                  >
                    Voir le carnet

                    <ChevronRight
                      size={17}
                    />
                  </button>
                )}
              </div>


              {trips.length ===
              0 ? (
                <section className="new-last-trip empty">
                  <NotebookText
                    size={34}
                  />

                  <div>
                    <strong>
                      Aucune sortie
                      enregistrée
                    </strong>

                    <p>
                      Ta prochaine
                      journée apparaîtra
                      ici.
                    </p>
                  </div>
                </section>
              ) : (
                <section className="new-last-trip">

                  <div className="new-last-header">

                    <div className="date-square">
                      <span>
                        {new Date(
                          trips[0]
                            .date +
                            "T12:00:00"
                        )
                          .toLocaleDateString(
                            "fr-FR",
                            {
                              weekday:
                                "short",
                            }
                          )
                          .replace(
                            ".",
                            ""
                          )
                          .toUpperCase()}
                      </span>

                      <strong>
                        {new Date(
                          trips[0]
                            .date +
                            "T12:00:00"
                        )
                          .getDate()
                          .toString()
                          .padStart(
                            2,
                            "0"
                          )}
                      </strong>

                      <small>
                        {new Date(
                          trips[0]
                            .date +
                            "T12:00:00"
                        )
                          .toLocaleDateString(
                            "fr-FR",
                            {
                              month:
                                "short",
                            }
                          )
                          .replace(
                            ".",
                            ""
                          )
                          .toUpperCase()}
                      </small>
                    </div>


                    <div className="new-last-title">
                      <strong>
                        {new Date(
                          trips[0]
                            .date +
                            "T12:00:00"
                        ).toLocaleDateString(
                          "fr-FR",
                          {
                            weekday:
                              "long",

                            day:
                              "numeric",

                            month:
                              "long",

                            year:
                              "numeric",
                          }
                        )}
                      </strong>

                      <div className="new-last-meta">
                        <span>
                          <MapPin
                            size={16}
                          />

                          Territoire :{" "}

                          <b>
                            {
                              trips[0]
                                .territory
                            }
                          </b>
                        </span>

                        <span>
                          <Crosshair
                            size={16}
                          />

                          Type de chasse :{" "}

                          <b>
                            {
                              trips[0]
                                .huntType
                            }
                          </b>
                        </span>
                      </div>
                    </div>


                    <button
                      className="new-edit-button"
                      type="button"
                      onClick={() =>
                        editTrip(
                          trips[0]
                        )
                      }
                    >
                      <Pencil
                        size={19}
                      />
                    </button>

                  </div>


                  <div className="new-last-line">
                    <div className="new-last-label">
                      <Target
                        size={20}
                      />

                      <span>
                        Prélèvements
                      </span>
                    </div>

                    <div className="new-last-value">
                      {trips[0]
                        .harvests
                        .length > 0
                        ? trips[0]
                            .harvests
                            .map(
                              (
                                item
                              ) =>
                                `${item.species} ×${item.quantity}`
                            )
                            .join(
                              ", "
                            )
                        : "Aucun prélèvement"}
                    </div>
                  </div>


                  <div className="new-last-line">
                    <div className="new-last-label">
                      <Dog
                        size={20}
                      />

                      <span>
                        Chiens
                      </span>
                    </div>

                    <div className="new-last-value">
                      {trips[0]
                        .dogs
                        .length > 0
                        ? trips[0]
                            .dogs
                            .join(
                              ", "
                            )
                        : "Aucun chien"}
                    </div>
                  </div>


                  <button
                    className="new-open-carnet"
                    type="button"
                    onClick={() =>
                      setScreen(
                        "carnet"
                      )
                    }
                  >
                    <BookOpen
                      size={20}
                    />

                    <span>
                      Ouvrir mon carnet
                    </span>

                    <ChevronRight
                      size={20}
                    />
                  </button>

                </section>
              )}


              {/* ACCÈS RAPIDES */}

              <div className="new-section-heading quick-heading">
                <h2>
                  ACCÈS RAPIDES
                </h2>
              </div>


              <section className="new-quick-grid">

                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "carnet"
                    )
                  }
                >
                  <div className="quick-icon">
                    <BookOpen
                      size={26}
                    />
                  </div>

                  <strong>
                    Mon carnet
                  </strong>

                  <span>
                    Mes sorties
                  </span>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "map"
                    )
                  }
                >
                  <div className="quick-icon">
                    <MapPin
                      size={26}
                    />
                  </div>

                  <strong>
                    Ma carte
                  </strong>

                  <span>
                    Mes positions
                  </span>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "stats"
                    )
                  }
                >
                  <div className="quick-icon">
                    <BarChart3
                      size={26}
                    />
                  </div>

                  <strong>
                    Statistiques
                  </strong>

                  <span>
                    Ma saison
                  </span>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "settings"
                    )
                  }
                >
                  <div className="quick-icon">
                    <Settings
                      size={26}
                    />
                  </div>

                  <strong>
                    Réglages
                  </strong>

                  <span>
                    Chiens & espèces
                  </span>
                </button>

              </section>
            </>
          )}


          {/* =================================================
              CARNET
              ================================================= */}

          {screen ===
            "carnet" && (
            <section className="carnet-page">

              <div className="carnet-heading">
                <div>
                  <span className="carnet-eyebrow">
                    MES JOURNÉES
                  </span>

                  <h1>
                    Mon carnet
                  </h1>

                  <p>
                    {trips.length}{" "}

                    {trips.length >
                    1
                      ? "sorties enregistrées"
                      : "sortie enregistrée"}
                  </p>
                </div>

                <button
                  type="button"
                  className="carnet-add"
                  onClick={newTrip}
                >
                  <Plus
                    size={21}
                  />

                  <span>
                    Nouvelle sortie
                  </span>
                </button>
              </div>


              {/* RECHERCHE */}

              <div className="carnet-search">
                <Search
                  size={20}
                />

                <input
                  type="search"
                  placeholder="Territoire, chien, espèce..."
                  value={
                    tripSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setTripSearch(
                      event
                        .target
                        .value
                    )
                  }
                />
              </div>


              {/* FILTRES */}

              <div className="carnet-filter-title">
                <SlidersHorizontal
                  size={16}
                />

                <span>
                  Filtrer par type
                  de chasse
                </span>
              </div>


              <div className="carnet-filters">
                {[
                  "Tous",

                  ...Array.from(
                    new Set(
                      trips
                        .map(
                          (
                            trip
                          ) =>
                            trip.huntType
                        )
                        .filter(
                          Boolean
                        )
                    )
                  ),
                ].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={
                      huntTypeFilter ===
                      type
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setHuntTypeFilter(
                        type
                      )
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>


              {/* RÉSULTATS */}

              <div className="carnet-results-heading">
                <strong>
                  {
                    filteredTrips.length
                  }{" "}

                  {filteredTrips.length >
                  1
                    ? "sorties"
                    : "sortie"}
                </strong>

                {(tripSearch ||
                  huntTypeFilter !==
                    "Tous") && (
                  <button
                    type="button"
                    onClick={() => {
                      setTripSearch(
                        ""
                      );

                      setHuntTypeFilter(
                        "Tous"
                      );
                    }}
                  >
                    Effacer les
                    filtres
                  </button>
                )}
              </div>


              {/* CHARGEMENT */}

              {loadingTrips && (
                <div className="carnet-empty">
                  <div className="carnet-empty-icon">
                    <CalendarDays
                      size={30}
                    />
                  </div>

                  <strong>
                    Chargement du
                    carnet...
                  </strong>
                </div>
              )}


              {/* VIDE */}

              {!loadingTrips &&
                filteredTrips.length ===
                  0 && (
                  <div className="carnet-empty">

                    <div className="carnet-empty-icon">
                      <Search
                        size={30}
                      />
                    </div>

                    <strong>
                      {trips.length ===
                      0
                        ? "Ton carnet est vide"
                        : "Aucune sortie trouvée"}
                    </strong>

                    <p>
                      {trips.length ===
                      0
                        ? "Enregistre ta première journée de chasse."
                        : "Essaie une autre recherche ou modifie les filtres."}
                    </p>

                    {trips.length ===
                      0 && (
                      <button
                        type="button"
                        onClick={
                          newTrip
                        }
                      >
                        <Plus
                          size={19}
                        />

                        Première
                        sortie
                      </button>
                    )}

                  </div>
                )}


              {/* CARTES */}

              {!loadingTrips &&
                filteredTrips.map(
                  (trip) => (
                    <article
                      className="carnet-trip-card"
                      key={
                        trip.id
                      }
                    >

                      <div className="carnet-trip-top">

                        <div className="carnet-date-box">
                          <span>
                            {new Date(
                              trip.date +
                                "T12:00:00"
                            )
                              .toLocaleDateString(
                                "fr-FR",
                                {
                                  weekday:
                                    "short",
                                }
                              )
                              .replace(
                                ".",
                                ""
                              )
                              .toUpperCase()}
                          </span>

                          <strong>
                            {new Date(
                              trip.date +
                                "T12:00:00"
                            )
                              .getDate()
                              .toString()
                              .padStart(
                                2,
                                "0"
                              )}
                          </strong>

                          <small>
                            {new Date(
                              trip.date +
                                "T12:00:00"
                            )
                              .toLocaleDateString(
                                "fr-FR",
                                {
                                  month:
                                    "short",
                                }
                              )
                              .replace(
                                ".",
                                ""
                              )
                              .toUpperCase()}
                          </small>
                        </div>


                        <div className="carnet-trip-main">

                          <span className="carnet-trip-type">
                            {
                              trip.huntType
                            }
                          </span>

                          <h2>
                            {
                              trip.territory
                            }
                          </h2>

                          <div className="carnet-trip-date">
                            <CalendarDays
                              size={
                                15
                              }
                            />

                            {new Date(
                              trip.date +
                                "T12:00:00"
                            ).toLocaleDateString(
                              "fr-FR",
                              {
                                weekday:
                                  "long",

                                day:
                                  "numeric",

                                month:
                                  "long",

                                year:
                                  "numeric",
                              }
                            )}
                          </div>

                        </div>


                        <button
                          type="button"
                          className="carnet-edit"
                          aria-label="Modifier la sortie"
                          onClick={() =>
                            editTrip(
                              trip
                            )
                          }
                        >
                          <Pencil
                            size={
                              18
                            }
                          />
                        </button>

                      </div>


                      {/* INFORMATIONS */}

                      <div className="carnet-trip-info">

                        <div className="carnet-info-row">

                          <div className="carnet-info-icon">
                            <Target
                              size={
                                19
                              }
                            />
                          </div>

                          <div>
                            <span>
                              Prélèvements
                            </span>

                            {trip
                              .harvests
                              .length >
                            0 ? (
                              <div className="carnet-harvests">
                                {trip.harvests.map(
                                  (
                                    harvest
                                  ) => (
                                    <span
                                      key={
                                        harvest.species
                                      }
                                    >
                                      {
                                        harvest.species
                                      }

                                      <b>
                                        ×
                                        {
                                          harvest.quantity
                                        }
                                      </b>
                                    </span>
                                  )
                                )}
                              </div>
                            ) : (
                              <p>
                                Aucun
                                prélèvement
                              </p>
                            )}
                          </div>

                        </div>


                        <div className="carnet-info-row">

                          <div className="carnet-info-icon">
                            <Dog
                              size={
                                19
                              }
                            />
                          </div>

                          <div>
                            <span>
                              Chiens
                            </span>

                            <p>
                              {trip
                                .dogs
                                .length >
                              0
                                ? trip.dogs.join(
                                    " • "
                                  )
                                : "Aucun chien"}
                            </p>
                          </div>

                        </div>


                        {trip.latitude !=
                          null &&
                          trip.longitude !=
                            null && (
                            <div className="carnet-info-row">

                              <div className="carnet-info-icon">
                                <MapPin
                                  size={
                                    19
                                  }
                                />
                              </div>

                              <div>
                                <span>
                                  Position GPS
                                </span>

                                <p>
                                  Position
                                  enregistrée
                                </p>
                              </div>

                            </div>
                          )}

                      </div>


                      {/* NOTES */}

                      {trip.notes && (
                        <div className="carnet-notes">
                          <span>
                            Notes
                          </span>

                          <p>
                            {
                              trip.notes
                            }
                          </p>
                        </div>
                      )}


                      {/* ACTIONS */}

                      <div className="carnet-actions">

                        <button
                          type="button"
                          className="carnet-modify"
                          onClick={() =>
                            editTrip(
                              trip
                            )
                          }
                        >
                          <Pencil
                            size={
                              17
                            }
                          />

                          Modifier
                        </button>


                        <button
                          type="button"
                          className="carnet-delete"
                          onClick={() =>
                            deleteTrip(
                              trip.id
                            )
                          }
                        >
                          <Trash2
                            size={
                              17
                            }
                          />

                          Supprimer
                        </button>

                      </div>

                    </article>
                  )
                )}

            </section>
          )}


          {/* =================================================
              CARTE
              ================================================= */}

          {screen === "map" && (
  <section className="hunting-map-page">

    <div className="hunting-map-heading">

      <div>
        <span className="carnet-eyebrow">
          MES POSITIONS
        </span>

        <h1>
          Ma carte
        </h1>

        <p>
          {
            trips.filter(
              (trip) =>
                trip.latitude != null &&
                trip.longitude != null
            ).length
          }{" "}
          {trips.filter(
            (trip) =>
              trip.latitude != null &&
              trip.longitude != null
          ).length > 1
            ? "sorties géolocalisées"
            : "sortie géolocalisée"}
        </p>
      </div>

      <div className="hunting-map-heading-icon">
        <MapIcon
          size={28}
          strokeWidth={1.7}
        />
      </div>

    </div>


    <section className="hunting-map-card">

      <div className="hunting-map-card-top">

        <div>
          <span>
            CARTE DE MES SORTIES
          </span>

          <strong>
            Tes journées enregistrées
          </strong>
        </div>

        <button
          type="button"
          className="hunting-map-location-button"
          onClick={findMeOnMap}
          disabled={locatingOnMap}
        >
          <Crosshair
            size={19}
            strokeWidth={2}
          />

          {locatingOnMap
            ? "Localisation..."
            : "Ma position"}
        </button>

      </div>


      {trips.filter(
        (trip) =>
          trip.latitude != null &&
          trip.longitude != null
      ).length === 0 &&
      !userPosition ? (

        <div className="hunting-map-empty">

          <div className="hunting-map-empty-icon">
            <MapPin
              size={34}
              strokeWidth={1.7}
            />
          </div>

          <strong>
            Aucune sortie géolocalisée
          </strong>

          <p>
            Ajoute une position GPS à une
            sortie pour la retrouver ici
            sur la carte.
          </p>

          <button
            type="button"
            onClick={newTrip}
          >
            <Plus
              size={19}
            />

            Nouvelle sortie
          </button>

        </div>

      ) : (

        <div className="hunting-map-wrapper">

          <MapContainer
            center={[
              47.2,
              -0.5,
            ]}
            zoom={8}
            style={{
              width: "100%",
              height: "100%",
            }}
          >

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />


            <MapAutoFit
              trips={trips}
              userPosition={
                userPosition
              }
            />


            {trips
              .filter(
                (trip) =>
                  trip.latitude != null &&
                  trip.longitude != null
              )
              .map((trip) => (

                <Marker
                  key={trip.id}
                  icon={huntingTripIcon}
                  position={[
                    trip.latitude as number,
                    trip.longitude as number,
                  ]}
                >

                  <Popup>

                    <article className="hunting-map-popup">

                      <div className="hunting-map-popup-top">

                        <div className="hunting-map-popup-icon">
                          <MapPin
                            size={20}
                          />
                        </div>

                        <div>
                          <span>
                            {
                              trip.huntType
                            }
                          </span>

                          <h3>
                            {
                              trip.territory
                            }
                          </h3>
                        </div>

                      </div>


                      <div className="hunting-map-popup-date">

                        <CalendarDays
                          size={16}
                        />

                        {new Date(
                          trip.date +
                            "T12:00:00"
                        ).toLocaleDateString(
                          "fr-FR",
                          {
                            weekday:
                              "long",

                            day:
                              "numeric",

                            month:
                              "long",

                            year:
                              "numeric",
                          }
                        )}

                      </div>


                      <div className="hunting-map-popup-info">

                        <div>

                          <Target
                            size={17}
                          />

                          <span>
                            <small>
                              Prélèvements
                            </small>

                            <strong>
                              {trip.harvests
                                .length > 0
                                ? trip.harvests
                                    .map(
                                      (
                                        harvest
                                      ) =>
                                        `${harvest.species} ×${harvest.quantity}`
                                    )
                                    .join(
                                      ", "
                                    )
                                : "Aucun"}
                            </strong>
                          </span>

                        </div>


                        <div>

                          <Dog
                            size={17}
                          />

                          <span>
                            <small>
                              Chiens
                            </small>

                            <strong>
                              {trip.dogs
                                .length > 0
                                ? trip.dogs.join(
                                    ", "
                                  )
                                : "Aucun"}
                            </strong>
                          </span>

                        </div>

                      </div>


                      {trip.notes && (

                        <div className="hunting-map-popup-notes">
                          {
                            trip.notes
                          }
                        </div>

                      )}


                      <button
                        type="button"
                        className="hunting-map-popup-edit"
                        onClick={() =>
                          editTrip(
                            trip
                          )
                        }
                      >
                        <Pencil
                          size={16}
                        />

                        Modifier cette sortie
                      </button>

                    </article>

                  </Popup>

                </Marker>

              ))}


            {userPosition && (

              <CircleMarker
                center={[
                  userPosition.latitude,
                  userPosition.longitude,
                ]}
                radius={9}
                pathOptions={{
                  color: "#ffffff",
                  weight: 3,
                  fillColor:
                    "#24583d",
                  fillOpacity: 1,
                }}
              >

                <Popup>
                  <div className="hunting-map-user-popup">
                    <Crosshair
                      size={17}
                    />

                    Ma position
                  </div>
                </Popup>

              </CircleMarker>

            )}

          </MapContainer>


          <div className="hunting-map-legend">

            <div>
              <span className="hunting-map-dot trip" />

              Sortie de chasse
            </div>

            {userPosition && (
              <div>
                <span className="hunting-map-dot user" />

                Ma position
              </div>
            )}

          </div>

        </div>

      )}

    </section>


    <section className="hunting-map-summary">

      <div>

        <div className="hunting-map-summary-icon">
          <MapPin
            size={21}
          />
        </div>

        <span>
          <strong>
            {
              trips.filter(
                (trip) =>
                  trip.latitude != null &&
                  trip.longitude != null
              ).length
            }
          </strong>

          Positions enregistrées
        </span>

      </div>


      <button
        type="button"
        onClick={() =>
          setScreen(
            "carnet"
          )
        }
      >
        Voir mon carnet

        <ChevronRight
          size={18}
        />
      </button>

    </section>

  </section>
)}

          {/* =================================================
              STATISTIQUES
              ================================================= */}

          {screen === "stats" && (
  <section className="hunting-stats-page">

    <div className="hunting-stats-heading">

      <div>
        <span className="carnet-eyebrow">
          MA SAISON
        </span>

        <h1>
          Statistiques
        </h1>

        <p>
          Le résumé complet de ta saison de chasse.
        </p>
      </div>

      <div className="hunting-stats-heading-icon">
        <BarChart3
          size={28}
          strokeWidth={1.8}
        />
      </div>

    </div>


    {/* CHIFFRES PRINCIPAUX */}

    <section className="hunting-stats-main-grid">

      <article className="hunting-stats-main-card">

        <div className="hunting-stats-main-icon">
          <BookOpen
            size={23}
          />
        </div>

        <div>
          <strong>
            {trips.length}
          </strong>

          <span>
            Sorties
          </span>
        </div>

        <small>
          Journées enregistrées
        </small>

      </article>


      <article className="hunting-stats-main-card brown">

        <div className="hunting-stats-main-icon">
          <Target
            size={23}
          />
        </div>

        <div>
          <strong>
            {totalHarvests}
          </strong>

          <span>
            Prélèvements
          </span>
        </div>

        <small>
          Sur l'ensemble de la saison
        </small>

      </article>


      <article className="hunting-stats-main-card">

        <div className="hunting-stats-main-icon">
          <Dog
            size={23}
          />
        </div>

        <div>
          <strong>
            {dogStats.length}
          </strong>

          <span>
            Chiens
          </span>
        </div>

        <small>
          Chiens utilisés
        </small>

      </article>


      <article className="hunting-stats-main-card brown">

        <div className="hunting-stats-main-icon">
          <MapPin
            size={23}
          />
        </div>

        <div>
          <strong>
            {territoryStats.length}
          </strong>

          <span>
            Territoires
          </span>
        </div>

        <small>
          Lieux de chasse différents
        </small>

      </article>

    </section>


    {/* FAVORIS */}

    <div className="hunting-stats-section-title">

      <div>
        <span>
          LES FAVORIS
        </span>

        <h2>
          Ma saison en un coup d'œil
        </h2>
      </div>

      <TreePine
        size={26}
        strokeWidth={1.5}
      />

    </div>


    <section className="hunting-stats-favorites">

      <article>

        <div className="hunting-stats-favorite-icon">
          <Target
            size={21}
          />
        </div>

        <small>
          Espèce la + prélevée
        </small>

        <strong>
          {favoriteSpecies?.name || "—"}
        </strong>

        <span>
          {favoriteSpecies
            ? `${favoriteSpecies.count} prélèvement${
                favoriteSpecies.count > 1
                  ? "s"
                  : ""
              }`
            : "Aucune donnée"}
        </span>

      </article>


      <article>

        <div className="hunting-stats-favorite-icon">
          <Dog
            size={21}
          />
        </div>

        <small>
          Chien le + utilisé
        </small>

        <strong>
          {favoriteDog?.name || "—"}
        </strong>

        <span>
          {favoriteDog
            ? `${favoriteDog.count} sortie${
                favoriteDog.count > 1
                  ? "s"
                  : ""
              }`
            : "Aucune donnée"}
        </span>

      </article>


      <article>

        <div className="hunting-stats-favorite-icon">
          <MapPin
            size={21}
          />
        </div>

        <small>
          Territoire favori
        </small>

        <strong>
          {favoriteTerritory?.name || "—"}
        </strong>

        <span>
          {favoriteTerritory
            ? `${favoriteTerritory.count} sortie${
                favoriteTerritory.count > 1
                  ? "s"
                  : ""
              }`
            : "Aucune donnée"}
        </span>

      </article>

    </section>


    {/* CLASSEMENTS */}

    <div className="hunting-stats-section-title ranking">

      <div>
        <span>
          CLASSEMENTS
        </span>

        <h2>
          Les chiffres de ma saison
        </h2>
      </div>

    </div>


    <section className="hunting-stats-ranking-card">

      <div className="hunting-stats-ranking-header">

        <div className="hunting-stats-ranking-icon">
          <Target
            size={21}
          />
        </div>

        <div>
          <strong>
            Prélèvements par espèce
          </strong>

          <span>
            Total par gibier
          </span>
        </div>

      </div>


      <div className="hunting-stats-ranking-list">

        {speciesStats.length === 0 ? (

          <div className="hunting-stats-no-data">
            Aucun prélèvement enregistré.
          </div>

        ) : (

          speciesStats.map(
            (item, index) => (

              <div
                className="hunting-stats-ranking-row"
                key={item.name}
              >

                <div className="hunting-stats-rank-number">
                  {index + 1}
                </div>

                <span className="hunting-stats-rank-name">
                  {item.name}
                </span>

                <strong>
                  {item.count}
                </strong>

              </div>

            )
          )

        )}

      </div>

    </section>


    <section className="hunting-stats-ranking-card">

      <div className="hunting-stats-ranking-header">

        <div className="hunting-stats-ranking-icon">
          <Dog
            size={21}
          />
        </div>

        <div>
          <strong>
            Sorties par chien
          </strong>

          <span>
            Nombre de journées
          </span>
        </div>

      </div>


      <div className="hunting-stats-ranking-list">

        {dogStats.length === 0 ? (

          <div className="hunting-stats-no-data">
            Aucun chien enregistré dans les sorties.
          </div>

        ) : (

          dogStats.map(
            (item, index) => (

              <div
                className="hunting-stats-ranking-row"
                key={item.name}
              >

                <div className="hunting-stats-rank-number">
                  {index + 1}
                </div>

                <span className="hunting-stats-rank-name">
                  {item.name}
                </span>

                <strong>
                  {item.count}
                </strong>

              </div>

            )
          )

        )}

      </div>

    </section>


    <section className="hunting-stats-ranking-card">

      <div className="hunting-stats-ranking-header">

        <div className="hunting-stats-ranking-icon">
          <MapPin
            size={21}
          />
        </div>

        <div>
          <strong>
            Sorties par territoire
          </strong>

          <span>
            Tes lieux les plus fréquentés
          </span>
        </div>

      </div>


      <div className="hunting-stats-ranking-list">

        {territoryStats.length === 0 ? (

          <div className="hunting-stats-no-data">
            Aucun territoire enregistré.
          </div>

        ) : (

          territoryStats.map(
            (item, index) => (

              <div
                className="hunting-stats-ranking-row"
                key={item.name}
              >

                <div className="hunting-stats-rank-number">
                  {index + 1}
                </div>

                <span className="hunting-stats-rank-name">
                  {item.name}
                </span>

                <strong>
                  {item.count}
                </strong>

              </div>

            )
          )

        )}

      </div>

    </section>


    <section className="hunting-stats-ranking-card">

      <div className="hunting-stats-ranking-header">

        <div className="hunting-stats-ranking-icon">
          <Crosshair
            size={21}
          />
        </div>

        <div>
          <strong>
            Types de chasse
          </strong>

          <span>
            Répartition de tes sorties
          </span>
        </div>

      </div>


      <div className="hunting-stats-ranking-list">

        {huntTypeStats.length === 0 ? (

          <div className="hunting-stats-no-data">
            Aucune sortie enregistrée.
          </div>

        ) : (

          huntTypeStats.map(
            (item, index) => (

              <div
                className="hunting-stats-ranking-row"
                key={item.name}
              >

                <div className="hunting-stats-rank-number">
                  {index + 1}
                </div>

                <span className="hunting-stats-rank-name">
                  {item.name}
                </span>

                <strong>
                  {item.count}
                </strong>

              </div>

            )
          )

        )}

      </div>

    </section>

  </section>
)}


          {/* =================================================
              RÉGLAGES
              ================================================= */}

          {screen ===
            "settings" && (
            <section className="settings-screen">

              <div className="hunting-settings-heading">

  <div>
    <span className="carnet-eyebrow">
      PERSONNALISATION
    </span>

    <h1>
      Réglages
    </h1>

    <p>
      Personnalise ton carnet de chasse.
    </p>
  </div>

  <div className="hunting-settings-heading-icon">
    <SlidersHorizontal
      size={28}
      strokeWidth={1.7}
    />
  </div>

</div>


              {loadingSettings ? (
                <p>
                  Chargement...
                </p>
              ) : (
                <>

                  {/* CHIENS */}

                  <section className="hunting-settings-card">

                    <div className="hunting-settings-card-header">

                      <div className="hunting-settings-card-icon">
                        <Dog size={24} />
                      </div>

                      <div>
                        <span>
                          MA MEUTE
                        </span>

                        <strong>
                          Mes chiens
                        </strong>

                        <small>
                          {dogs.length}{" "}
                          {dogs.length > 1
                            ? "chiens enregistrés"
                            : "chien enregistré"}
                        </small>
                      </div>

                    </div>


                    <div className="hunting-settings-add">

                      <input
                        type="text"
                        placeholder="Nom du nouveau chien"
                        value={newDogName}
                        onChange={(event) =>
                          setNewDogName(
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter"
                          ) {
                            addDog();
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={addDog}
                        aria-label="Ajouter le chien"
                      >
                        <Plus size={21} />
                      </button>

                    </div>


                    <div className="hunting-settings-list">

                      {dogs.length === 0 ? (

                        <div className="hunting-settings-empty">
                          <Dog size={28} />

                          <span>
                            Aucun chien enregistré.
                          </span>
                        </div>

                      ) : (

                        dogs.map((dog) => (

                          <div
                            className="hunting-settings-row"
                            key={dog.id}
                          >

                            <div className="hunting-settings-row-icon">
                              <Dog size={18} />
                            </div>

                            <div className="hunting-settings-row-name">
                              <strong>
                                {dog.nom}
                              </strong>

                              <small>
                                Chien de chasse
                              </small>
                            </div>

                            <button
                              type="button"
                              className="hunting-settings-delete"
                              onClick={() =>
                                deleteDog(dog)
                              }
                              aria-label={`Supprimer ${dog.nom}`}
                            >
                              <Trash2 size={18} />
                            </button>

                          </div>

                        ))

                      )}

                    </div>

                  </section>


                  {/* ESPÈCES */}

                  <section className="hunting-settings-card">

                    <div className="hunting-settings-card-header">

                      <div className="hunting-settings-card-icon">
                        <Target size={24} />
                      </div>

                      <div>
                        <span>
                          GIBIER
                        </span>

                        <strong>
                          Mes espèces
                        </strong>

                        <small>
                          {speciesList.length}{" "}
                          {speciesList.length > 1
                            ? "espèces enregistrées"
                            : "espèce enregistrée"}
                        </small>
                      </div>

                    </div>


                    <div className="hunting-settings-add">

                      <input
                        type="text"
                        placeholder="Nom de la nouvelle espèce"
                        value={newSpeciesName}
                        onChange={(event) =>
                          setNewSpeciesName(
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            addSpecies();
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={addSpecies}
                        aria-label="Ajouter l'espèce"
                      >
                        <Plus size={21} />
                      </button>

                    </div>


                    <div className="hunting-settings-list">

                      {speciesList.length === 0 ? (

                        <div className="hunting-settings-empty">
                          <Target size={28} />

                          <span>
                            Aucune espèce enregistrée.
                          </span>
                        </div>

                      ) : (

                        speciesList.map((item) => (

                          <div
                            className="hunting-settings-row"
                            key={item.id}
                          >

                            <div className="hunting-settings-row-icon">
                              <Target size={18} />
                            </div>

                            <div className="hunting-settings-row-name">
                              <strong>
                                {item.nom}
                              </strong>

                              <small>
                                Espèce de gibier
                              </small>
                            </div>

                            <button
                              type="button"
                              className="hunting-settings-delete"
                              onClick={() =>
                                deleteSpecies(item)
                              }
                              aria-label={`Supprimer ${item.nom}`}
                            >
                              <Trash2 size={18} />
                            </button>

                          </div>

                        ))

                      )}

                    </div>

                  </section>

                </>
              )}

            </section>
          )}

        </section>


        {/* =================================================
            NAVIGATION BAS
            ================================================= */}

        <nav className="bottom-nav new-bottom-nav">

          <button
            className={
              screen === "home"
                ? "active"
                : ""
            }
            onClick={() =>
              setScreen("home")
            }
          >
            <Home
              size={25}
            />

            <span>
              Accueil
            </span>
          </button>


          <button
            className={
              screen ===
              "carnet"
                ? "active"
                : ""
            }
            onClick={() =>
              setScreen(
                "carnet"
              )
            }
          >
            <BookOpen
              size={25}
            />

            <span>
              Carnet
            </span>
          </button>


          <button
            className="add-button"
            onClick={newTrip}
            aria-label="Nouvelle sortie"
          >
            <Plus
              size={35}
              strokeWidth={
                1.8
              }
            />
          </button>


          <button
            className={
              screen === "map"
                ? "active"
                : ""
            }
            onClick={() =>
              setScreen("map")
            }
          >
            <MapIcon
              size={25}
            />

            <span>
              Carte
            </span>
          </button>


          <button
            className={
              screen ===
              "stats"
                ? "active"
                : ""
            }
            onClick={() =>
              setScreen(
                "stats"
              )
            }
          >
            <BarChart3
              size={25}
            />

            <span>
              Stats
            </span>
          </button>

        </nav>


        {/* =================================================
            FORMULAIRE SORTIE
            ================================================= */}

        {showForm && (
          <div className="trip-form-overlay">

            <section className="trip-form-sheet">

              <div className="trip-form-header">

                <div>
                  <small>
                    CARNET DE CHASSE
                  </small>

                  <h2>
                    {editingTripId
                      ? "Modifier la sortie"
                      : "Nouvelle sortie"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="trip-form-close"
                  onClick={
                    closeForm
                  }
                >
                  <X
                    size={22}
                  />
                </button>

              </div>


              <div className="form-group">
                <label>
                  Date
                </label>

                <input
                  type="date"
                  value={
                    form.date
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      date:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>


              <div className="form-group">
                <label>
                  Territoire
                </label>

                <input
                  type="text"
                  placeholder="Ex. Bois de Vernoil"
                  value={
                    form.territory
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      territory:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>


              <div className="form-group">
                <label>
                  Type de chasse
                </label>

                <select
                  value={
                    form.huntType
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      huntType:
                        event
                          .target
                          .value,
                    })
                  }
                >
                  <option>
                    Battue
                  </option>

                  <option>
                    Approche
                  </option>

                  <option>
                    Affût
                  </option>

                  <option>
                    Devant soi
                  </option>

                  <option>
                    Petit gibier
                  </option>

                  <option>
                    Autre
                  </option>
                </select>
              </div>


              {/* GPS */}

              <div className="form-group">
                <label>
                  Position GPS
                </label>

                {form.latitude !=
                  null &&
                form.longitude !=
                  null ? (
                  <div className="gps-saved">

                    <div>
                      <MapPin
                        size={
                          20
                        }
                      />

                      <span>
                        Position
                        enregistrée
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={
                        removePosition
                      }
                    >
                      Retirer
                    </button>

                  </div>
                ) : (
                  <button
                    type="button"
                    className="gps-button"
                    onClick={
                      useMyPosition
                    }
                    disabled={
                      locating
                    }
                  >
                    <MapPin
                      size={19}
                    />

                    {locating
                      ? "Localisation..."
                      : "Utiliser ma position"}
                  </button>
                )}

              </div>


              {/* PRÉLÈVEMENTS */}

              <div className="form-group">
                <label>
                  Prélèvements
                </label>

                <div className="harvest-form">

                  <select
                    value={
                      species
                    }
                    onChange={(
                      event
                    ) =>
                      setSpecies(
                        event
                          .target
                          .value
                      )
                    }
                  >
                    <option value="">
                      Choisir une
                      espèce
                    </option>

                    {speciesList.map(
                      (
                        item
                      ) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.nom
                          }
                        >
                          {
                            item.nom
                          }
                        </option>
                      )
                    )}
                  </select>


                  <input
                    type="number"
                    min="1"
                    value={
                      quantity
                    }
                    onChange={(
                      event
                    ) =>
                      setQuantity(
                        Number(
                          event
                            .target
                            .value
                        )
                      )
                    }
                  />


                  <button
                    type="button"
                    onClick={
                      addHarvest
                    }
                  >
                    <Plus
                      size={19}
                    />
                  </button>

                </div>


                {form.harvests
                  .length > 0 && (
                  <div className="harvest-list">

                    {form.harvests.map(
                      (
                        harvest
                      ) => (
                        <div
                          className="harvest-item"
                          key={
                            harvest.species
                          }
                        >
                          <span>
                            {
                              harvest.species
                            }

                            <strong>
                              {" "}
                              ×
                              {
                                harvest.quantity
                              }
                            </strong>
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeHarvest(
                                harvest.species
                              )
                            }
                          >
                            <X
                              size={
                                17
                              }
                            />
                          </button>
                        </div>
                      )
                    )}

                  </div>
                )}

              </div>


              {/* CHIENS */}

              <div className="form-group">
                <label>
                  Chiens
                </label>

                <div className="dog-grid">

                  {dogs.map(
                    (dog) => {
                      const selected =
                        form.dogs.includes(
                          dog.nom
                        );

                      return (
                        <button
                          key={
                            dog.id
                          }
                          type="button"
                          className={
                            selected
                              ? "dog-chip selected"
                              : "dog-chip"
                          }
                          onClick={() =>
                            toggleDog(
                              dog.nom
                            )
                          }
                        >
                          <Dog
                            size={
                              16
                            }
                          />

                          {
                            dog.nom
                          }
                        </button>
                      );
                    }
                  )}

                </div>
              </div>


              {/* NOTES */}

              <div className="form-group">
                <label>
                  Notes /
                  observations
                </label>

                <textarea
                  rows={4}
                  placeholder="Déroulement de la journée, météo, observations..."
                  value={
                    form.notes
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      notes:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>


              {/* ACTIONS */}

              <div className="trip-form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeForm
                  }
                >
                  Annuler
                </button>


                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    saveTrip
                  }
                >
                  {editingTripId
                    ? "Enregistrer les modifications"
                    : "Enregistrer la sortie"}
                </button>

              </div>

            </section>
          </div>
        )}

      </section>
    </main>
  );
}


/* =========================================================
   PETIT COMPOSANT STATISTIQUES
   ========================================================= */

function StatsList({
  title,
  items,
}: {
  title: string;

  items: {
    name: string;
    count: number;
  }[];
}) {
  return (
    <section className="stats-list-card">
      <h2>
        {title}
      </h2>

      {items.length === 0 ? (
        <p>
          Aucune donnée pour
          le moment.
        </p>
      ) : (
        <div className="stats-list">
          {items.map(
            (
              item,
              index
            ) => (
              <div
                key={
                  item.name
                }
                className="stats-list-row"
              >
                <span>
                  <b>
                    {index +
                      1}.
                  </b>{" "}
                  {
                    item.name
                  }
                </span>

                <strong>
                  {
                    item.count
                  }
                </strong>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}