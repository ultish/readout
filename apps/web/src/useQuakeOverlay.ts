import type { MapRef } from "react-map-gl/maplibre";
import { useEffect, type RefObject } from "react";

type ImageSource = {
  updateImage: (options: {
    url: string;
    coordinates: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ];
  }) => void;
};

/**
 * J-SHIS paints the quake grid as a WMS image, not an XYZ tile.
 * Refresh that image when the camera stops.
 */
export function useQuakeOverlay(
  mapRef: RefObject<MapRef | null>,
  ready: boolean,
  enabled: boolean,
) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) return;

    let dead = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: AbortController | undefined;
    let blobUrl: string | undefined;

    const apply = async () => {
      if (dead) return;
      if (map.getLayer("quake")) {
        map.setLayoutProperty("quake", "visibility", enabled ? "visible" : "none");
      }
      if (!enabled) return;

      const bounds = map.getBounds();
      const west = bounds.getWest();
      const east = bounds.getEast();
      const south = bounds.getSouth();
      const north = bounds.getNorth();
      abort?.abort();
      abort = new AbortController();
      const params = new URLSearchParams({
        west: String(west),
        south: String(south),
        east: String(east),
        north: String(north),
        width: "768",
        height: "768",
      });
      try {
        const res = await fetch(`/api/quake-overlay?${params}`, {
          signal: abort.signal,
        });
        if (!res.ok || dead) return;
        const blob = await res.blob();
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = URL.createObjectURL(blob);
        const coordinates: [
          [number, number],
          [number, number],
          [number, number],
          [number, number],
        ] = [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ];
        const existing = map.getSource("quake") as ImageSource | undefined;
        if (!existing) {
          map.addSource("quake", { type: "image", url: blobUrl, coordinates });
          const before = map.getLayer("flood") ? "flood" : undefined;
          map.addLayer(
            {
              id: "quake",
              type: "raster",
              source: "quake",
              paint: { "raster-opacity": 0.72, "raster-fade-duration": 0 },
            },
            before,
          );
        } else {
          existing.updateImage({ url: blobUrl, coordinates });
          map.setLayoutProperty("quake", "visibility", "visible");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void apply(), 180);
    };

    schedule();
    map.on("moveend", schedule);
    return () => {
      dead = true;
      clearTimeout(timer);
      abort?.abort();
      map.off("moveend", schedule);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [mapRef, ready, enabled]);
}
