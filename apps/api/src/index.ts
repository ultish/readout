import {
  DEBRIS_FLOW,
  eraFromYear,
  FLOOD_L2,
  LANDSLIDE_ZONE,
  parseLatLon,
  rasterTileZoom,
  STEEP_SLOPE,
  TSUNAMI,
} from "@readout/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import {
  loginOptions,
  loginVerify,
  registrationOptions,
  registrationVerify,
  requestOrigin,
  sessionCookie,
  sessionToken,
  userIdFromCookie,
} from "./auth.js";
import { sampleDepth, sampleFlag } from "./sample.js";
import { geocode, quakeAt, quakeOverlayUrl, reverseTown, soilAt } from "./upstream.js";

type Bindings = {
  DB: D1Database;
  SESSION_SECRET?: string;
};

interface PlaceRow {
  id: string;
  label: string;
  address: string | null;
  lat: number;
  lon: number;
  year_built: number | null;
  quake_label: string | null;
  flood_label: string | null;
  tsunami_label: string | null;
  landslide_label: string | null;
  era: string | null;
  report_json: string;
  created_at: string;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5175", "http://127.0.0.1:5175"],
  }),
);

app.get("/api/health", (c) => c.json({ ok: true, service: "readout" }));

app.get("/api/geocode", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  if (!q) return c.json({ error: "Type a city or an address." }, 400);
  const direct = parseLatLon(q);
  if (direct) {
    return c.json({
      results: [{ label: q, ...direct, zoom: 16, prefecture: "", city: "", town: "" }],
    });
  }
  try {
    const results = await geocode(q);
    return c.json({ results });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Geocode failed" },
      502,
    );
  }
});

app.get("/api/readout", async (c) => {
  const lat = Number(c.req.query("lat"));
  const lon = Number(c.req.query("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return c.json({ error: "lat and lon are required" }, 400);
  }
  if (lat < 20 || lat > 50 || lon < 122 || lon > 154) {
    return c.json({ error: "Point is outside Japan" }, 400);
  }
  const zoomQuery = c.req.query("zoom");
  let cameraZoom = 15;
  if (zoomQuery != null && zoomQuery !== "") {
    cameraZoom = Number(zoomQuery);
    if (!Number.isFinite(cameraZoom)) return c.json({ error: "zoom must be a number" }, 400);
  }
  const tileZoom = rasterTileZoom(cameraZoom);
  try {
    const [placeName, quake, soil, flood, tsunami, debris, steep, slide] =
      await Promise.all([
        reverseTown(lat, lon),
        quakeAt(lat, lon),
        soilAt(lat, lon),
        sampleDepth(FLOOD_L2, lat, lon, tileZoom),
        sampleDepth(TSUNAMI, lat, lon, tileZoom),
        sampleFlag(DEBRIS_FLOW, lat, lon, "debris", tileZoom),
        sampleFlag(STEEP_SLOPE, lat, lon, "steep", tileZoom),
        sampleFlag(LANDSLIDE_ZONE, lat, lon, "slide", tileZoom),
      ]);
    const landslideIn = [debris, steep, slide].some((f) => f.inZone === true);
    const landslideKnown = [debris, steep, slide].every((f) => f.status === "ok");
    return c.json({
      lat,
      lon,
      placeName,
      quake,
      flood: {
        ...flood,
        scenario: "assumed_maximum",
        caveat:
          "Not coloured means the Geospatial Information Authority tile has no flood colour here. Some prefecture-managed rivers are missing from that dataset.",
      },
      tsunami,
      landslide: {
        debrisFlow: debris,
        steepSlope: steep,
        landslide: slide,
        inAny: landslideKnown ? landslideIn : landslideIn ? true : null,
      },
      softGround: soil,
      liquefaction: {
        nationalStatus: "no_national_tile",
        label: "No national liquefaction tile",
        caveats: [
          "Check the municipal hazard map before you offer. This screen does not paint liquefaction.",
        ],
      },
      sources: [
        {
          name: "Geospatial Information Authority of Japan",
          detail: "Pale map, flood, tsunami, and landslide caution tiles",
        },
        {
          name: "J-SHIS",
          detail: `${quake.version} average case, 30-year chance of intensity 6-lower or higher`,
        },
        { name: "HeartRails Geo API", detail: "Address and town-block search" },
      ],
      disclaimer:
        "This repackages public Japanese government hazard data for personal screening. It is not insurance, legal, or engineering advice. Confirm with municipal maps and your agent’s important-matters explanation before purchase.",
    });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Readout failed" },
      502,
    );
  }
});

app.get("/api/quake-overlay", async (c) => {
  const west = Number(c.req.query("west"));
  const south = Number(c.req.query("south"));
  const east = Number(c.req.query("east"));
  const north = Number(c.req.query("north"));
  const width = Math.min(1024, Math.max(64, Number(c.req.query("width") ?? 768)));
  const height = Math.min(1024, Math.max(64, Number(c.req.query("height") ?? 768)));
  if (![west, south, east, north].every(Number.isFinite) || east <= west || north <= south) {
    return c.json({ error: "Bounds are invalid" }, 400);
  }

  const cacheKey = new Request(c.req.url);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const upstream = quakeOverlayUrl(west, south, east, north, width, height);
  const res = await fetch(upstream, {
    headers: { "User-Agent": "readout/0.1 (personal hazard map)" },
  });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("image/png")) {
    return c.json({ error: `J-SHIS overlay ${res.status}` }, 502);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const response = new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
  await caches.default.put(cacheKey, response.clone());
  return response;
});

async function currentUser(c: { env: Bindings; req: { header: (name: string) => string | undefined } }) {
  const userId = await userIdFromCookie(c.req.header("cookie"), c.env.SESSION_SECRET);
  if (!userId) return null;
  return c.env.DB.prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; email: string }>();
}

app.get("/api/auth/me", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ user: null }, 401);
  return c.json({ user: { email: user.email } });
});

app.post("/api/auth/register/options", async (c) => {
  if (!c.env.SESSION_SECRET) return c.json({ error: "Sign-in is not configured" }, 500);
  const origin = requestOrigin(c.req.header("origin"), c.req.url);
  if (!origin) return c.json({ error: "Origin is not allowed" }, 400);
  const body = (await c.req.json()) as { email?: string };
  const email = body.email?.trim() ?? "";
  if (!email || email.length > 200) return c.json({ error: "Enter a name for this sign-in" }, 400);
  const options = await registrationOptions(c.env.DB, origin, email);
  return c.json(options);
});

app.post("/api/auth/register/verify", async (c) => {
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: "Sign-in is not configured" }, 500);
  const origin = requestOrigin(c.req.header("origin"), c.req.url);
  if (!origin) return c.json({ error: "Origin is not allowed" }, 400);
  const response = (await c.req.json()) as RegistrationResponseJSON;
  const user = await registrationVerify(c.env.DB, origin, response);
  if (!user) return c.json({ error: "Sign-in could not be created" }, 400);
  const token = await sessionToken(secret, user.userId);
  c.header("Set-Cookie", sessionCookie(token, origin.startsWith("https:")));
  return c.json({ user: { email: user.email } });
});

app.post("/api/auth/login/options", async (c) => {
  if (!c.env.SESSION_SECRET) return c.json({ error: "Sign-in is not configured" }, 500);
  const origin = requestOrigin(c.req.header("origin"), c.req.url);
  if (!origin) return c.json({ error: "Origin is not allowed" }, 400);
  return c.json(await loginOptions(c.env.DB, origin));
});

app.post("/api/auth/login/verify", async (c) => {
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: "Sign-in is not configured" }, 500);
  const origin = requestOrigin(c.req.header("origin"), c.req.url);
  if (!origin) return c.json({ error: "Origin is not allowed" }, 400);
  const response = (await c.req.json()) as AuthenticationResponseJSON;
  const user = await loginVerify(c.env.DB, origin, response);
  if (!user) return c.json({ error: "Sign-in failed" }, 401);
  const token = await sessionToken(secret, user.id);
  c.header("Set-Cookie", sessionCookie(token, origin.startsWith("https:")));
  return c.json({ user: { email: user.email } });
});

app.post("/api/auth/logout", async (c) => {
  const origin = requestOrigin(c.req.header("origin"), c.req.url);
  c.header("Set-Cookie", sessionCookie("", origin?.startsWith("https:") ?? true, true));
  return c.json({ ok: true });
});

app.get("/api/places", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "Sign in" }, 401);
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM places WHERE owner_id = ? ORDER BY created_at DESC",
  )
    .bind(user.id)
    .all<PlaceRow>();
  return c.json({ places: results });
});

app.post("/api/places", async (c) => {
  const body = (await c.req.json()) as {
    label?: string;
    address?: string;
    lat?: number;
    lon?: number;
    yearBuilt?: number | null;
    quakeLabel?: string;
    floodLabel?: string;
    tsunamiLabel?: string;
    landslideLabel?: string;
    report?: unknown;
  };
  const lat = body.lat;
  const lon = body.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return c.json({ error: "lat and lon are required" }, 400);
  }
  const user = await currentUser(c);
  if (!user) return c.json({ error: "Sign in" }, 401);
  const year = body.yearBuilt ?? null;
  const era = year != null && Number.isFinite(year) ? eraFromYear(year) : null;
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO places (
      id, label, address, lat, lon, year_built, quake_label, flood_label,
      tsunami_label, landslide_label, era, report_json, owner_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      body.label?.trim() || body.address?.trim() || `${lat}, ${lon}`,
      body.address ?? null,
      lat,
      lon,
      year,
      body.quakeLabel ?? null,
      body.floodLabel ?? null,
      body.tsunamiLabel ?? null,
      body.landslideLabel ?? null,
      era?.label ?? null,
      JSON.stringify(body.report ?? {}),
      user.id,
    )
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM places WHERE id = ? AND owner_id = ?")
    .bind(id, user.id)
    .first<PlaceRow>();
  return c.json(row, 201);
});

app.delete("/api/places/:id", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "Sign in" }, 401);
  await c.env.DB.prepare("DELETE FROM places WHERE id = ? AND owner_id = ?")
    .bind(c.req.param("id"), user.id)
    .run();
  return c.json({ ok: true });
});

export default app;
