/** J-SHIS engineering-geomorphologic class names. Unknown names stay Japanese. */
const SOIL_EN: Record<string, string> = {
  山地: "Mountain",
  山麓地: "Mountain footslope",
  丘陵: "Hill",
  火山地: "Volcano",
  火山山麓地: "Volcanic footslope",
  火山性丘陵: "Volcanic hill",
  岩石台地: "Rock terrace",
  砂礫質台地: "Gravel terrace",
  ローム台地: "Loam terrace",
  谷底低地: "Valley bottom",
  扇状地: "Alluvial fan",
  自然堤防: "Natural levee",
  後背湿地: "Back marsh",
  旧河道: "Former river channel",
  "三角州・海岸低地": "Delta or coastal lowland",
  "砂州・砂礫州": "Sand or gravel bar",
  砂丘: "Sand dune",
  "砂州・砂丘間低地": "Lowland between dunes",
  干拓地: "Reclaimed wetland",
  埋立地: "Reclaimed fill",
  "磯・岩礁": "Rocky shore",
  河原: "Gravel riverbed",
  河道: "River channel",
  湖沼: "Lake or marsh",
};

export function soilEnglish(jname: string | null | undefined): string | null {
  if (!jname) return null;
  return SOIL_EN[jname] ?? null;
}
