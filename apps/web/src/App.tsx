import {
  DEBRIS_FLOW,
  eraFromYear,
  FLOOD_L2,
  GSI_PALE,
  LANDSLIDE_ZONE,
  STEEP_SLOPE,
  TSUNAMI,
} from "@readout/core";
import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  currentUser,
  deletePlace,
  fetchPlaces,
  fetchReadout,
  loginOptions,
  loginVerify,
  logout,
  registerOptions,
  registerVerify,
  savePlace,
  searchAddress,
} from "./api";
import {
  coarseNotes,
  depthLabel,
  initialLang,
  landslideLine,
  messages,
  storedDepth,
  storedEra,
  type Lang,
} from "./copy";
import type { GeocodeHit, Readout, SavedPlace } from "./types";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON, PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";
import { gsiTileUrl } from "./hazardTiles";
import { startTour, startTourIfNew } from "./tour";
import { useQuakeOverlay } from "./useQuakeOverlay";

const EMPTY_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#d5ddd6" },
    },
  ],
};

type LayerId = "flood" | "tsunami" | "landslide" | "quake";

export default function App() {
  const mapRef = useRef<MapRef>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    flood: true,
    tsunami: false,
    landslide: false,
    quake: true,
  });
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const [report, setReport] = useState<Readout | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState("");
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = messages(lang);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  useQuakeOverlay(mapRef, ready, layers.quake);

  useEffect(() => {
    document.documentElement.lang = lang === "ja" ? "ja" : "en-AU";
    try {
      localStorage.setItem("readout-lang", lang);
    } catch {
      /* private mode */
    }
  }, [lang]);

  const loadPlaces = useCallback(async () => {
    setPlaces(await fetchPlaces());
  }, []);

  useEffect(() => {
    let gone = false;
    void currentUser()
      .then((person) => {
        if (!gone) setUser(person);
      })
      .catch(() => {
        if (!gone) setUser(null);
      });
    return () => {
      gone = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setPlaces([]);
      return;
    }
    void loadPlaces().catch(() => setPlaces([]));
  }, [user, loadPlaces]);

  const fly = useCallback((lat: number, lon: number, zoom?: number) => {
    const map = mapRef.current?.getMap();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextZoom = zoom ?? Math.max(map?.getZoom() ?? 12, 14);
    mapRef.current?.flyTo({
      center: [lon, lat],
      zoom: nextZoom,
      duration: reduce ? 0 : 700,
    });
    return nextZoom;
  }, []);

  const openPoint = useCallback(async (lat: number, lon: number, cameraZoom?: number) => {
    const zoom = cameraZoom ?? mapRef.current?.getMap()?.getZoom() ?? 14;
    setPin({ lat, lon });
    setShowSaved(false);
    setLoading(true);
    setReportError(null);
    setSaveNote(null);
    try {
      setReport(await fetchReadout(lat, lon, zoom));
    } catch (err) {
      setReport(null);
      setReportError(err instanceof Error ? err.message : t.readoutFailed);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const latParam = params.get("lat");
    const lonParam = params.get("lon");
    if (latParam == null || lonParam == null) return;
    const lat = Number(latParam);
    const lon = Number(lonParam);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const zoom = fly(lat, lon);
    void openPoint(lat, lon, zoom);
  }, [ready, fly, openPoint]);

  useEffect(() => {
    if (!ready) return;
    if (new URLSearchParams(window.location.search).has("lat")) return;
    const timer = window.setTimeout(() => startTourIfNew(lang), 400);
    return () => window.clearTimeout(timer);
  }, [ready, lang]);

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearchError(null);
    setHits([]);
    if (!query.trim()) {
      setSearchError(t.emptySearch);
      return;
    }
    try {
      const results = await searchAddress(query);
      if (results.length === 0) {
        setSearchError(t.noMatch);
        return;
      }
      const first = results[0];
      if (!first) return;
      if (results.length === 1) {
        const zoom = fly(first.lat, first.lon, first.zoom);
        void openPoint(first.lat, first.lon, zoom);
        return;
      }
      setHits(results);
      fly(first.lat, first.lon, first.zoom);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : t.searchFailed);
    }
  }

  function closeDock() {
    setReport(null);
    setReportError(null);
    setLoading(false);
    setShowSaved(false);
  }

  function onClick(event: MapLayerMouseEvent) {
    void openPoint(event.lngLat.lat, event.lngLat.lng, event.target.getZoom());
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationNote(t.noLocation);
      return;
    }
    setLocationNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        mapRef.current?.flyTo({
          center: [lon, lat],
          zoom: 16,
          duration: reduce ? 0 : 700,
        });
        setPin({ lat, lon });
      },
      () => setLocationNote(t.noLocation),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function toggle(id: LayerId) {
    setLayers((current) => ({ ...current, [id]: !current[id] }));
  }

  const yearNumber = Number(year);
  const era =
    year.trim() && Number.isInteger(yearNumber) ? eraFromYear(yearNumber) : null;

  async function onSave() {
    if (!report) return;
    if (!user) {
      setShowSaved(true);
      return;
    }
    try {
      await savePlace({
        label: report.placeName ?? `${report.lat.toFixed(4)}, ${report.lon.toFixed(4)}`,
        address: report.placeName,
        lat: report.lat,
        lon: report.lon,
        yearBuilt: era ? yearNumber : null,
        quakeLabel: report.quake.label,
        floodLabel: report.flood.label,
        tsunamiLabel: report.tsunami.label,
        landslideLabel: landslideLine(
          report.landslide.debrisFlow,
          report.landslide.steepSlope,
          report.landslide.landslide,
          t,
        ),
        report,
      });
      setSaveNote(t.savedNote);
      await loadPlaces();
    } catch (err) {
      setSaveNote(err instanceof Error ? err.message : t.saveFailed);
    }
  }

  const dockOpen = showSaved || report != null || reportError != null || loading;

  return (
    <div className="map-root">
      <div id="the-map" className="map-canvas">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 139.767, latitude: 35.681, zoom: 12 }}
        mapStyle={EMPTY_STYLE}
        onLoad={() => setReady(true)}
        onClick={onClick}
        cursor="crosshair"
      >
        <Source
          id="pale"
          type="raster"
          tiles={[GSI_PALE]}
          tileSize={256}
          attribution={t.attribution}
        />
        <Layer id="pale" type="raster" source="pale" />
        <Source id="flood" type="raster" tiles={[FLOOD_L2]} tileSize={256} maxzoom={17} />
        <Layer
          id="flood"
          type="raster"
          source="flood"
          paint={{ "raster-opacity": 0.78 }}
          layout={{ visibility: layers.flood ? "visible" : "none" }}
        />
        <Source id="tsunami" type="raster" tiles={[TSUNAMI]} tileSize={256} maxzoom={17} />
        <Layer
          id="tsunami"
          type="raster"
          source="tsunami"
          paint={{ "raster-opacity": 0.72 }}
          layout={{ visibility: layers.tsunami ? "visible" : "none" }}
        />
        <Source id="debris" type="raster" tiles={[gsiTileUrl(DEBRIS_FLOW)]} tileSize={256} maxzoom={17} />
        <Layer
          id="debris"
          type="raster"
          source="debris"
          paint={{ "raster-opacity": 0.75 }}
          layout={{ visibility: layers.landslide ? "visible" : "none" }}
        />
        <Source id="steep" type="raster" tiles={[gsiTileUrl(STEEP_SLOPE)]} tileSize={256} maxzoom={17} />
        <Layer
          id="steep"
          type="raster"
          source="steep"
          paint={{ "raster-opacity": 0.75 }}
          layout={{ visibility: layers.landslide ? "visible" : "none" }}
        />
        <Source id="slide" type="raster" tiles={[gsiTileUrl(LANDSLIDE_ZONE)]} tileSize={256} maxzoom={17} />
        <Layer
          id="slide"
          type="raster"
          source="slide"
          paint={{ "raster-opacity": 0.75 }}
          layout={{ visibility: layers.landslide ? "visible" : "none" }}
        />
        {pin && (
          <Marker longitude={pin.lon} latitude={pin.lat} anchor="center">
            <span className="pin" />
          </Marker>
        )}
        <NavigationControl position="bottom-right" showCompass={false} />
      </Map>
      </div>

      <div className="topbar">
        <div className="search-row">
          <form id="address-search" className="search" onSubmit={(event) => void onSearch(event)}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.placeholder}
              aria-label={t.address}
            />
            <button type="submit">{t.go}</button>
            {hits.length > 1 && (
              <ul className="hits">
                {hits.map((hit) => (
                  <li key={`${hit.lon},${hit.lat},${hit.label}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setHits([]);
                        const zoom = fly(hit.lat, hit.lon, hit.zoom);
                        void openPoint(hit.lat, hit.lon, zoom);
                      }}
                    >
                      {hit.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
          <button
            type="button"
            className="locate-icon"
            onClick={locateMe}
            aria-label={t.useLocation}
            title={t.useLocation}
          >
            <LocateIcon />
          </button>
        </div>
        <div className="layers">
          <div id="map-layers" role="group" aria-label={t.layersLabel}>
            {(
              [
                ["flood", t.flood],
                ["tsunami", t.tsunami],
                ["landslide", t.landslide],
                ["quake", t.quake],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={layers[id]}
                onClick={() => toggle(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            id="saved-places"
            type="button"
            className="chip"
            aria-pressed={showSaved}
            onClick={() => {
              setShowSaved((open) => !open);
            }}
          >
            {t.saved}
          </button>
          <button type="button" className="chip" onClick={() => startTour(lang)}>
            {t.tour}
          </button>
        </div>
        <div className="lang" role="group" aria-label={t.langLabel}>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
            English
          </button>
          <button type="button" aria-pressed={lang === "ja"} onClick={() => setLang("ja")}>
            日本語
          </button>
        </div>
        {searchError && <p className="search-error">{searchError}</p>}
        {locationNote && <p className="search-error">{locationNote}</p>}
      </div>

      {dockOpen && (
        <aside className="dock">
          <div className="sheet-head">
            <span className="muted">{showSaved ? t.savedPlaces : t.thisSpot}</span>
            <button type="button" className="text-button" onClick={closeDock}>
              {t.close}
            </button>
          </div>
          {loading && <p>{t.reading}</p>}
          {reportError && <p>{reportError}</p>}
          {showSaved && !user && (
            <SignIn
              t={t}
              name={authName}
              error={authError}
              onName={setAuthName}
              onSignedIn={(person) => {
                setUser(person);
                setAuthError(null);
                if (report) setShowSaved(false);
              }}
              onFail={() => setAuthError(t.passkeyFailed)}
            />
          )}
          {showSaved && user && (
            <>
              <div className="account">
                <p>
                  <span className="muted">{t.signedInAs}</span> {user.email}
                </p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    void logout().then(() => {
                      setUser(null);
                      setPlaces([]);
                    });
                  }}
                >
                  {t.signOut}
                </button>
              </div>
              <SavedTable
                t={t}
                places={places}
                onOpen={(place) => {
                  const zoom = fly(place.lat, place.lon);
                  void openPoint(place.lat, place.lon, zoom);
                }}
                onDelete={async (id) => {
                  await deletePlace(id);
                  await loadPlaces();
                }}
              />
            </>
          )}
          {report && !showSaved && (
            <>
              <p className="place-name">{report.placeName ?? t.clickedPoint}</p>
              <p className={report.quake.probability != null && report.quake.probability >= 0.06 ? "quake-number in" : "quake-number"}>
                {report.quake.label}
              </p>
              <p>{t.quakeTitle}</p>
              <div className="row">
                <span>{t.floodRow}</span>
                <strong className={report.flood.inZone ? "in" : undefined}>{depthLabel(report.flood, t)}</strong>
              </div>
              <p className="muted">
                {report.lat.toFixed(5)}, {report.lon.toFixed(5)}
                {report.quake.meshcode ? ` · ${t.mesh} ${report.quake.meshcode}` : ""}
              </p>
              <p className="caveat">{t.floodCaveat}</p>
              {coarseNotes(report.flood.caveats, t).map((line) => (
                <p className="caveat" key={line}>{line}</p>
              ))}
              <div className="row">
                <span>{t.tsunamiRow}</span>
                <strong className={report.tsunami.inZone ? "in" : undefined}>{depthLabel(report.tsunami, t)}</strong>
              </div>
              <div className="row">
                <span>{t.landslideRow}</span>
                <strong className={report.landslide.inAny ? "in" : undefined}>
                  {landslideLine(
                    report.landslide.debrisFlow,
                    report.landslide.steepSlope,
                    report.landslide.landslide,
                    t,
                  )}
                </strong>
              </div>
              <div className="row">
                <span>{t.ground}</span>
                <strong>
                  {(lang === "ja" ? report.softGround.soilJa : report.softGround.soilEn) ??
                    report.softGround.soilJa ??
                    report.softGround.soilEn}
                </strong>
              </div>
              {report.softGround.avs && (
                <p className="muted">
                  {t.avs} {report.softGround.avs} m/s
                  {report.softGround.arv ? ` · ${t.amplification} ${report.softGround.arv}` : ""}
                </p>
              )}
              <p className="caveat">{t.notLiquefaction}</p>
              {lang === "en" && report.softGround.soilJa && !report.softGround.soilEn && (
                <p className="caveat">{t.untranslated(report.softGround.soilJa)}</p>
              )}
              <div className="row">
                <span>{t.liquefaction}</span>
                <strong>{t.noLiquefactionTile}</strong>
              </div>
              <p className="caveat">{t.liquefactionNote}</p>
              <label className="year">
                {t.yearBuilt}
                <input
                  inputMode="numeric"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  placeholder={t.optional}
                />
              </label>
              <ul className="era-legend">
                {(Object.keys(t.era) as Array<keyof typeof t.era>).map((key) => (
                  <li key={key} className={era?.era === key ? "current" : undefined}>
                    <strong>{t.era[key].label}</strong>
                    <span className="muted">{t.era[key].years}</span>
                    <span>{t.era[key].description}</span>
                  </li>
                ))}
              </ul>
              {yearNumber === 1981 && <p className="caveat">{t.caveat1981}</p>}
              {yearNumber === 2000 && <p className="caveat">{t.caveat2000}</p>}
              <div className="actions">
                <button type="button" className="text-button" onClick={() => void onSave()}>
                  {t.savePlace}
                </button>
                {saveNote && <span>{saveNote}</span>}
              </div>
              <p className="disclaimer">{t.disclaimer}</p>
              <p className="sources">
                {t.sources}: {report.sources.map((source) => source.name).join(", ")}.
              </p>
            </>
          )}
        </aside>
      )}

    </div>
  );
}

function LocateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <circle cx="12" cy="12" r="6.15" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 1.5V7.2M12 16.8V22.5M1.5 12H7.2M16.8 12H22.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function SignIn({
  t,
  name,
  error,
  onName,
  onSignedIn,
  onFail,
}: {
  t: ReturnType<typeof messages>;
  name: string;
  error: string | null;
  onName: (value: string) => void;
  onSignedIn: (user: { email: string }) => void;
  onFail: () => void;
}) {
  async function create() {
    try {
      const options = await registerOptions(name.trim() || "Readout");
      const attestation = await startRegistration({
        optionsJSON: options as unknown as PublicKeyCredentialCreationOptionsJSON,
      });
      const result = await registerVerify(attestation as RegistrationResponseJSON);
      onSignedIn(result.user);
    } catch {
      onFail();
    }
  }

  async function existing() {
    try {
      const options = await loginOptions();
      const assertion = await startAuthentication({
        optionsJSON: options as unknown as PublicKeyCredentialRequestOptionsJSON,
      });
      const result = await loginVerify(assertion as AuthenticationResponseJSON);
      onSignedIn(result.user);
    } catch {
      onFail();
    }
  }

  return (
    <div className="sign-in">
      <p>{t.signInHint}</p>
      <label className="sign-field">
        {t.signInName}
        <input value={name} onChange={(event) => onName(event.target.value)} placeholder="you@example.com" />
      </label>
      <button type="button" className="locate" onClick={() => void create()}>
        {t.createSignIn}
      </button>
      <button type="button" className="text-button" onClick={() => void existing()}>
        {t.useExisting}
      </button>
      {error && <p className="sign-error" role="alert">{error}</p>}
    </div>
  );
}

function SavedTable({
  t,
  places,
  onOpen,
  onDelete,
}: {
  t: ReturnType<typeof messages>;
  places: SavedPlace[];
  onOpen: (place: SavedPlace) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  if (places.length === 0) return <p className="empty-places">{t.noPlaces}</p>;
  return (
    <ul className="saved-list">
      {places.map((place) => (
        <li key={place.id} className="saved-place">
          <button type="button" className="place-link" onClick={() => onOpen(place)}>
            {place.label}
          </button>
          <button type="button" className="text-button" onClick={() => void onDelete(place.id)}>
            {t.remove}
          </button>
          <div className="saved-facts">
            <span><b>{t.quake}</b> {place.quake_label}</span>
            <span><b>{t.flood}</b> {storedDepth(place.flood_label, t)}</span>
            <span><b>{t.tsunami}</b> {storedDepth(place.tsunami_label, t)}</span>
            {place.landslide_label && <span>{place.landslide_label}</span>}
            {place.era && <span>{storedEra(place.era, t)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
