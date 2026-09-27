import {
  DEBRIS_FLOW,
  eraFromYear,
  FLOOD_L2,
  GSI_PALE,
  LANDSLIDE_ZONE,
  SEISMIC_LEGEND,
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
import { deletePlace, fetchPlaces, fetchReadout, savePlace, searchAddress } from "./api";
import type { GeocodeHit, Readout, SavedPlace } from "./types";
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

function flagText(flag: Readout["landslide"]["debrisFlow"]): string {
  if (flag.status !== "ok") return "no tile";
  return flag.inZone ? "in the zone" : "not coloured";
}

function landslideText(report: Readout): string {
  const { debrisFlow, steepSlope, landslide } = report.landslide;
  return `Debris flow ${flagText(debrisFlow)}. Steep slope ${flagText(steepSlope)}. Landslide ${flagText(landslide)}.`;
}

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
  const [detailsOpen, setDetailsOpen] = useState(false);

  useQuakeOverlay(mapRef, ready, layers.quake);

  const loadPlaces = useCallback(async () => {
    setPlaces(await fetchPlaces());
  }, []);

  useEffect(() => {
    void loadPlaces().catch(() => setPlaces([]));
  }, [loadPlaces]);

  const fly = useCallback((lat: number, lon: number, zoom?: number) => {
    const map = mapRef.current?.getMap();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextZoom = zoom ?? Math.max(map?.getZoom() ?? 12, 14);
    mapRef.current?.flyTo({
      center: [lon, lat],
      zoom: nextZoom,
      duration: reduce ? 0 : 700,
    });
  }, []);

  const openPoint = useCallback(async (lat: number, lon: number) => {
    setPin({ lat, lon });
    setShowSaved(false);
    setDetailsOpen(false);
    setLoading(true);
    setReportError(null);
    setSaveNote(null);
    try {
      setReport(await fetchReadout(lat, lon));
    } catch (err) {
      setReport(null);
      setReportError(err instanceof Error ? err.message : "Readout failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const latParam = params.get("lat");
    const lonParam = params.get("lon");
    if (latParam == null || lonParam == null) return;
    const lat = Number(latParam);
    const lon = Number(lonParam);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    fly(lat, lon);
    void openPoint(lat, lon);
  }, [ready, fly, openPoint]);

  useEffect(() => {
    if (!ready) return;
    if (new URLSearchParams(window.location.search).has("lat")) return;
    const timer = window.setTimeout(startTourIfNew, 400);
    return () => window.clearTimeout(timer);
  }, [ready]);

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearchError(null);
    setHits([]);
    if (!query.trim()) {
      setSearchError("Type a city or an address.");
      return;
    }
    try {
      const results = await searchAddress(query);
      if (results.length === 0) {
        setSearchError("No place matched that.");
        return;
      }
      const first = results[0];
      if (!first) return;
      if (results.length === 1) {
        fly(first.lat, first.lon, first.zoom);
        void openPoint(first.lat, first.lon);
        return;
      }
      setHits(results);
      fly(first.lat, first.lon, first.zoom);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    }
  }

  function closeDock() {
    setReport(null);
    setReportError(null);
    setLoading(false);
    setShowSaved(false);
    setDetailsOpen(false);
  }

  function onClick(event: MapLayerMouseEvent) {
    void openPoint(event.lngLat.lat, event.lngLat.lng);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationNote("This browser did not share a location.");
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
      () => setLocationNote("This browser did not share a location."),
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
        landslideLabel: landslideText(report),
        report,
      });
      setSaveNote("Saved");
      await loadPlaces();
    } catch (err) {
      setSaveNote(err instanceof Error ? err.message : "Could not save");
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
          attribution="Geospatial Information Authority of Japan. Quake layer: J-SHIS. Address search: HeartRails"
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
        <Source id="debris" type="raster" tiles={[DEBRIS_FLOW]} tileSize={256} maxzoom={17} />
        <Layer
          id="debris"
          type="raster"
          source="debris"
          paint={{ "raster-opacity": 0.75 }}
          layout={{ visibility: layers.landslide ? "visible" : "none" }}
        />
        <Source id="steep" type="raster" tiles={[STEEP_SLOPE]} tileSize={256} maxzoom={17} />
        <Layer
          id="steep"
          type="raster"
          source="steep"
          paint={{ "raster-opacity": 0.75 }}
          layout={{ visibility: layers.landslide ? "visible" : "none" }}
        />
        <Source id="slide" type="raster" tiles={[LANDSLIDE_ZONE]} tileSize={256} maxzoom={17} />
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
        <div className="search-stack">
        <form id="address-search" className="search" onSubmit={(event) => void onSearch(event)}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sapporo, 札幌, or an address"
            aria-label="Address"
          />
          <button type="submit">Go</button>
          {hits.length > 1 && (
            <ul className="hits">
              {hits.map((hit) => (
                <li key={`${hit.lon},${hit.lat},${hit.label}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setHits([]);
                      fly(hit.lat, hit.lon, hit.zoom);
                      void openPoint(hit.lat, hit.lon);
                    }}
                  >
                    {hit.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
        <button type="button" className="locate" onClick={locateMe}>
          Use my location
        </button>
        </div>
        <div className="layers">
          <div id="map-layers" role="group" aria-label="Map layers">
            {(
              [
                ["flood", "Flood"],
                ["tsunami", "Tsunami"],
                ["landslide", "Landslide"],
                ["quake", "Quake"],
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
            Saved
          </button>
          <button type="button" className="chip" onClick={() => startTour()}>
            Tour
          </button>
        </div>
      </div>

      {searchError && <p className="search-error">{searchError}</p>}
      {locationNote && <p className="search-error">{locationNote}</p>}

      {dockOpen && (
        <aside className="dock">
          <div className="sheet-head">
            <span className="muted">{showSaved ? "Saved places" : "This spot"}</span>
            <button type="button" className="text-button" onClick={closeDock}>
              Close
            </button>
          </div>
          {loading && <p>Reading this point…</p>}
          {reportError && <p>{reportError}</p>}
          {showSaved && (
            <SavedTable
              places={places}
              onOpen={(place) => {
                fly(place.lat, place.lon);
                void openPoint(place.lat, place.lon);
              }}
              onDelete={async (id) => {
                await deletePlace(id);
                await loadPlaces();
              }}
            />
          )}
          {report && !showSaved && (
            <>
              <p className="place-name">{report.placeName ?? "Clicked point"}</p>
              <p className={report.quake.probability != null && report.quake.probability >= 0.06 ? "quake-number in" : "quake-number"}>
                {report.quake.label}
              </p>
              <p>{report.quake.title}</p>
              <div className="row">
                <span>Flood, assumed maximum</span>
                <strong className={report.flood.inZone ? "in" : undefined}>{report.flood.label}</strong>
              </div>
              <button
                type="button"
                className="sheet-toggle"
                aria-expanded={detailsOpen}
                onClick={() => setDetailsOpen((open) => !open)}
              >
                {detailsOpen ? "Hide details" : "Show details"}
              </button>
              <div className={detailsOpen ? "sheet-extra open" : "sheet-extra"}>
              <p className="muted">
                {report.lat.toFixed(5)}, {report.lon.toFixed(5)}
                {report.quake.meshcode ? ` · mesh ${report.quake.meshcode}` : ""}
              </p>
              <p className="caveat">{report.flood.caveat}</p>
              <div className="row">
                <span>Tsunami</span>
                <strong className={report.tsunami.inZone ? "in" : undefined}>{report.tsunami.label}</strong>
              </div>
              <div className="row">
                <span>Landslide</span>
                <strong className={report.landslide.inAny ? "in" : undefined}>{landslideText(report)}</strong>
              </div>
              {[report.landslide.debrisFlow, report.landslide.steepSlope, report.landslide.landslide]
                .flatMap((flag) => flag.caveats)
                .filter((line, index, all) => all.indexOf(line) === index)
                .map((line) => (
                  <p className="caveat" key={line}>{line}</p>
                ))}
              <div className="row">
                <span>Ground</span>
                <strong>
                  {report.softGround.soilEn ?? report.softGround.soilJa ?? report.softGround.caveats[0]}
                </strong>
              </div>
              {report.softGround.avs && (
                <p className="muted">
                  AVS {report.softGround.avs} m/s
                  {report.softGround.arv ? ` · amplification ${report.softGround.arv}` : ""}
                </p>
              )}
              {report.softGround.caveats.map((line) => (
                <p className="caveat" key={line}>{line}</p>
              ))}
              <div className="row">
                <span>Liquefaction</span>
                <strong>{report.liquefaction.label}</strong>
              </div>
              <label className="year">
                Year built
                <input
                  inputMode="numeric"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  placeholder="optional"
                />
              </label>
              <ul className="era-legend">
                {SEISMIC_LEGEND.map((item) => (
                  <li key={item.era} className={era?.era === item.era ? "current" : undefined}>
                    <strong>{item.label}</strong>
                    <span className="muted">{item.years}</span>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
              {era?.caveats[0] && <p className="caveat">{era.caveats[0]}</p>}
              <div className="actions">
                <button type="button" className="text-button" onClick={() => void onSave()}>
                  Save place
                </button>
                {saveNote && <span>{saveNote}</span>}
              </div>
              <p className="disclaimer">{report.disclaimer}</p>
              <p className="sources">
                Sources: {report.sources.map((source) => source.name).join(", ")}.
              </p>
              </div>
            </>
          )}
        </aside>
      )}

    </div>
  );
}

function SavedTable({
  places,
  onOpen,
  onDelete,
}: {
  places: SavedPlace[];
  onOpen: (place: SavedPlace) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  if (places.length === 0) return <p>No places saved yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Place</th>
          <th>Quake</th>
          <th>Flood</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {places.map((place) => (
          <tr key={place.id}>
            <td>
              <button type="button" className="place-link" onClick={() => onOpen(place)}>
                {place.label}
              </button>
              <div className="muted">{place.tsunami_label}</div>
              <div className="muted">{place.landslide_label}</div>
              {place.era && <div className="muted">{place.era}</div>}
            </td>
            <td>{place.quake_label}</td>
            <td>{place.flood_label}</td>
            <td>
              <button type="button" className="text-button" onClick={() => void onDelete(place.id)}>
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
