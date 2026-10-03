# Readout

English hazard map for looking at urban property in Japan. The map is the screen. Flood, tsunami, and landslide are Geospatial Information Authority tiles. Quake is the J-SHIS 30-year chance of intensity 6-lower or higher.

```bash
pnpm install
pnpm --filter @readout/api db:migrate
pnpm dev
```

The map is at http://localhost:5175. The API is a Cloudflare Worker on port 8791, with the saved places in a local D1 database. `pnpm --filter @readout/api run deploy` publishes it once `wrangler login` has been run and `database_id` in `apps/api/wrangler.jsonc` is a real D1 database. `pnpm deploy` is a different pnpm command, so the `run` is required. `./scripts/deploy.sh` builds and publishes. It does not apply D1 migrations.

`pnpm test` checks the tile pixel, flood colours, and the quake percentage against the spike.
