#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pnpm --filter @readout/core build
pnpm --filter @readout/web build
pnpm --filter @readout/api run deploy
