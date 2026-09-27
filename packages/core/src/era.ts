export type SeismicEra =
  | "pre_1981"
  | "shin_taishin_1981_2000"
  | "post_2000";

export interface EraReading {
  era: SeismicEra;
  label: string;
  description: string;
  caveats: string[];
}

export const SEISMIC_LEGEND: Array<{
  era: SeismicEra;
  label: string;
  years: string;
  description: string;
}> = [
  {
    era: "pre_1981",
    label: "Old seismic code",
    years: "Permit before June 1981",
    description:
      "The building was designed so it should not fall down in a moderate earthquake. A major one can still wreck it.",
  },
  {
    era: "shin_taishin_1981_2000",
    label: "1981 seismic code",
    years: "June 1981 to May 2000",
    description:
      "The aim is that the building should not collapse in a major earthquake, so people can get out. It can still be badly damaged.",
  },
  {
    era: "post_2000",
    label: "2000 seismic standard",
    years: "Permit after June 2000",
    description:
      "Wooden houses also had to have the ground checked, a tighter frame, and more balanced walls. A concrete apartment is still mainly judged on the 1981 rule.",
  },
];

function legendEntry(era: SeismicEra) {
  const entry = SEISMIC_LEGEND.find((item) => item.era === era);
  if (!entry) throw new Error(`Missing seismic legend entry for ${era}`);
  return entry;
}

/** Year only. June 1981 and June 2000 cutoffs cannot be known from a year. */
export function eraFromYear(year: number): EraReading {
  if (year < 1981) {
    const entry = legendEntry("pre_1981");
    return { era: entry.era, label: entry.label, description: entry.description, caveats: [] };
  }
  if (year >= 2001) {
    const entry = legendEntry("post_2000");
    return { era: entry.era, label: entry.label, description: entry.description, caveats: [] };
  }
  const entry = legendEntry("shin_taishin_1981_2000");
  if (year === 2000) {
    return {
      era: entry.era,
      label: "1981 code, possibly the 2000 standard",
      description: entry.description,
      caveats: ["The 2000 standard applies to permits after June 2000."],
    };
  }
  return {
    era: entry.era,
    label: entry.label,
    description: entry.description,
    caveats:
      year === 1981
        ? ["The 1981 code applies to permits after June 1981."]
        : [],
  };
}
