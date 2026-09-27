/** Published probability is 0–1. */
export function formatQuakeProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

export const QUAKE_TITLE = "30-year chance of intensity 6-lower or higher";
