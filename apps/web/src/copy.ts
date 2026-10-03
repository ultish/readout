import type { DepthClass, DepthReading, FlagReading, SeismicEra, ZoneClass } from "@readout/core";

export type Lang = "en" | "ja";

const DEPTH_EN: Record<string, DepthClass | "not" | "none" | "unknown" | "error"> = {
  "under 0.5 m": "under_0.5m",
  "0.5–3 m": "0.5_3m",
  "3–5 m": "3_5m",
  "5–10 m": "5_10m",
  "10–20 m": "10_20m",
  "over 20 m": "over_20m",
  "Not coloured on this tile": "not",
  "No tile published here": "none",
  "In a coloured zone, depth not in the legend": "unknown",
  "Tile could not be read": "error",
};

const ERA_EN: Record<string, SeismicEra> = {
  "Old seismic code": "pre_1981",
  "1981 seismic code": "shin_taishin_1981_2000",
  "1981 code, possibly the 2000 standard": "shin_taishin_1981_2000",
  "2000 seismic standard": "post_2000",
};

export function initialLang(): Lang {
  const param = new URLSearchParams(window.location.search).get("lang");
  if (param === "en" || param === "ja") return param;
  try {
    const saved = localStorage.getItem("readout-lang");
    if (saved === "en" || saved === "ja") return saved;
  } catch {
    /* private mode */
  }
  return "en";
}

const copy = {
  en: {
    langLabel: "Language",
    go: "Go",
    address: "Address",
    placeholder: "Sapporo, 札幌, or an address",
    useLocation: "Use my location",
    layersLabel: "Map layers",
    flood: "Flood",
    tsunami: "Tsunami",
    landslide: "Landslide",
    quake: "Quake",
    saved: "Saved",
    tour: "Tour",
    thisSpot: "This spot",
    savedPlaces: "Saved places",
    close: "Close",
    reading: "Reading this point…",
    clickedPoint: "Clicked point",
    mesh: "mesh",
    floodRow: "Flood, assumed maximum",
    tsunamiRow: "Tsunami",
    landslideRow: "Landslide",
    ground: "Ground",
    liquefaction: "Liquefaction",
    yearBuilt: "Year built",
    optional: "optional",
    savePlace: "Save place",
    savedNote: "Saved",
    saveFailed: "Could not save",
    emptySearch: "Type a city or an address.",
    noMatch: "No place matched that.",
    searchFailed: "Search failed",
    readoutFailed: "Readout failed",
    noLocation: "This browser did not share a location.",
    noPlaces: "No places saved yet.",
    place: "Place",
    remove: "Remove",
    signIn: "Sign in",
    signOut: "Sign out",
    createSignIn: "Create a sign-in",
    useExisting: "Use an existing sign-in",
    signInName: "Name on this sign-in",
    signInHint: "Saved places belong to this sign-in. They are not shared.",
    passkeyFailed: "The browser did not finish the sign-in.",
    signedInAs: "Signed in as",
    notColoured: "Not coloured on this tile",
    noTile: "No tile published here",
    depthUnknown: "In a coloured zone, depth not in the legend",
    tileError: "Tile could not be read",
    inZone: "In the published caution zone",
    debrisFlow: "Debris flow",
    steepSlope: "Steep slope",
    landslideZone: "Landslide",
    zoneNone: "Not in a published zone",
    zoneClear: "not in the zone",
    zoneIn: "in the zone",
    zoneMissing: "no tile",
    coarseClear: (zoom: number) => `no tile finer than zoom ${zoom}`,
    nearby: (meters: number) => `${meters} m away`,
    zoneKind: {
      special: "special caution",
      caution: "caution",
      planned_special: "special caution, planned",
      planned_caution: "caution, planned",
    } satisfies Record<ZoneClass, string>,
    quakeTitle: "30-year chance of intensity 6-lower or higher",
    avs: "AVS",
    amplification: "amplification",
    notLiquefaction: "Soft ground is not a liquefaction map.",
    untranslated: (name: string) => `Landform name not translated: ${name}`,
    noLiquefactionTile: "No national liquefaction tile",
    liquefactionNote:
      "Check the municipal hazard map before you offer. This screen does not paint liquefaction.",
    coarseTile: (zoom: number) => `Finest published tile here is zoom ${zoom}.`,
    floodCaveat:
      "Not coloured means the Geospatial Information Authority tile has no flood colour here. Some prefecture-managed rivers are missing from that dataset.",
    disclaimer:
      "This repackages public Japanese government hazard data for personal screening. It is not insurance, legal, or engineering advice. Confirm with municipal maps and your agent’s important-matters explanation before purchase.",
    sources: "Sources",
    attribution:
      "Geospatial Information Authority of Japan. Quake layer: J-SHIS. Address search: HeartRails",
    next: "Next",
    back: "Back",
    done: "Done",
    tourSearchTitle: "Find a town",
    tourSearch:
      "Type a city such as Sapporo or 札幌, a Japanese address, or coordinates. One match moves the map there. Click the map to pick the exact spot.",
    tourLayersTitle: "The colours are published zones",
    tourLayers:
      "Flood is the assumed-maximum depth. Quake is the 30-year chance of shaking intensity 6-lower or higher. Tsunami and landslide stay off until you turn them on.",
    tourClickTitle: "Click a spot",
    tourClick:
      "The panel lists flood depth, the quake percentage, tsunami, landslide, and the ground type for that point. Red text means the point sits inside a published zone.",
    tourSavedTitle: "Keep a shortlist",
    tourSaved: "Save place stores that readout on this machine. Saved opens the list so you can jump back.",
    depth: {
      "under_0.5m": "under 0.5 m",
      "0.5_3m": "0.5–3 m",
      "3_5m": "3–5 m",
      "5_10m": "5–10 m",
      "10_20m": "10–20 m",
      over_20m: "over 20 m",
    } satisfies Record<DepthClass, string>,
    era: {
      pre_1981: {
        label: "Old seismic code",
        years: "Permit before June 1981",
        description:
          "The building was designed so it should not fall down in a moderate earthquake. A major one can still wreck it.",
      },
      shin_taishin_1981_2000: {
        label: "1981 seismic code",
        years: "June 1981 to May 2000",
        description:
          "The aim is that the building should not collapse in a major earthquake, so people can get out. It can still be badly damaged.",
      },
      post_2000: {
        label: "2000 seismic standard",
        years: "Permit after June 2000",
        description:
          "Wooden houses also had to have the ground checked, a tighter frame, and more balanced walls. A concrete apartment is still mainly judged on the 1981 rule.",
      },
    } satisfies Record<SeismicEra, { label: string; years: string; description: string }>,
    caveat1981: "The 1981 code applies to permits after June 1981.",
    caveat2000: "The 2000 standard applies to permits after June 2000.",
  },
  ja: {
    langLabel: "言語",
    go: "検索",
    address: "住所",
    placeholder: "札幌、Sapporo、住所",
    useLocation: "現在地を使う",
    layersLabel: "地図レイヤ",
    flood: "洪水",
    tsunami: "津波",
    landslide: "土砂",
    quake: "地震",
    saved: "保存",
    tour: "案内",
    thisSpot: "この地点",
    savedPlaces: "保存した地点",
    close: "閉じる",
    reading: "この地点を読み取り中…",
    clickedPoint: "選んだ地点",
    mesh: "メッシュ",
    floodRow: "洪水・想定最大規模",
    tsunamiRow: "津波",
    landslideRow: "土砂",
    ground: "地盤",
    liquefaction: "液状化",
    yearBuilt: "築年",
    optional: "任意",
    savePlace: "この地点を保存",
    savedNote: "保存しました",
    saveFailed: "保存できませんでした",
    emptySearch: "都市名か住所を入力してください。",
    noMatch: "該当する場所がありません。",
    searchFailed: "検索に失敗しました",
    readoutFailed: "読み取りに失敗しました",
    noLocation: "このブラウザは現在地を共有しませんでした。",
    noPlaces: "保存した地点はまだありません。",
    place: "地点",
    remove: "削除",
    signIn: "サインイン",
    signOut: "サインアウト",
    createSignIn: "サインインを作る",
    useExisting: "既存のサインインを使う",
    signInName: "このサインインの名前",
    signInHint: "保存した地点はこのサインインのものです。ほかの人とは共有しません。",
    passkeyFailed: "ブラウザはサインインを完了しませんでした。",
    signedInAs: "サインイン中",
    notColoured: "このタイルでは着色されていません",
    noTile: "ここに公開タイルはありません",
    depthUnknown: "着色されていますが、凡例にない色です",
    tileError: "タイルを読めませんでした",
    inZone: "公表された警戒区域内",
    debrisFlow: "土石流",
    steepSlope: "急傾斜地",
    landslideZone: "地すべり",
    zoneNone: "公表された区域の外",
    zoneClear: "区域の外",
    zoneIn: "区域内",
    zoneMissing: "タイルなし",
    coarseClear: (zoom: number) => `ズーム${zoom}より詳しいタイルはない`,
    nearby: (meters: number) => `${meters} m先`,
    zoneKind: {
      special: "特別警戒",
      caution: "警戒",
      planned_special: "特別警戒（指定予定）",
      planned_caution: "警戒（指定予定）",
    } satisfies Record<ZoneClass, string>,
    quakeTitle: "30年以内に震度6弱以上となる確率",
    avs: "AVS",
    amplification: "増幅率",
    notLiquefaction: "地盤の区分は液状化マップではありません。",
    untranslated: (name: string) => `地形名の訳がありません: ${name}`,
    noLiquefactionTile: "全国の液状化タイルはありません",
    liquefactionNote:
      "購入前に市区町村のハザードマップを確認してください。この画面は液状化を塗りません。",
    coarseTile: (zoom: number) => `ここで最も詳しいタイルはズーム${zoom}です。`,
    floodCaveat:
      "着色がないのは、国土地理院のタイルに洪水の色がないという意味です。都道府県管理の河川がデータに含まれていない場合があります。",
    disclaimer:
      "日本の公的なハザードデータを、個人の検討用にまとめたものです。保険、法律、工学の助言ではありません。購入前に市区町村の地図と重要事項説明を確認してください。",
    sources: "出典",
    attribution: "国土地理院。地震レイヤ: J-SHIS。住所検索: HeartRails",
    next: "次へ",
    back: "戻る",
    done: "完了",
    tourSearchTitle: "場所を探す",
    tourSearch:
      "札幌や Sapporo のような都市名、日本の住所、座標を入力します。候補が一つなら地図がそこへ移動します。正確な地点は地図をタップします。",
    tourLayersTitle: "色は公表された区域です",
    tourLayers:
      "洪水は想定最大規模の浸水深です。地震は30年以内に震度6弱以上となる確率です。津波と土砂は、オンにするまで表示しません。",
    tourClickTitle: "地点をタップ",
    tourClick:
      "パネルに浸水深、地震の確率、津波、土砂、地盤の区分が出ます。赤い文字は、公表された区域の中にあるという意味です。",
    tourSavedTitle: "候補を残す",
    tourSaved: "この地点を保存すると、この端末に読み取りが残ります。保存で一覧を開き、あとから戻れます。",
    depth: {
      "under_0.5m": "0.5m未満",
      "0.5_3m": "0.5〜3m",
      "3_5m": "3〜5m",
      "5_10m": "5〜10m",
      "10_20m": "10〜20m",
      over_20m: "20m以上",
    } satisfies Record<DepthClass, string>,
    era: {
      pre_1981: {
        label: "旧耐震",
        years: "1981年6月より前の建築確認",
        description:
          "中程度の地震で倒れないように設計されています。大きな地震では、大きな被害を受けることがあります。",
      },
      shin_taishin_1981_2000: {
        label: "新耐震",
        years: "1981年6月〜2000年5月",
        description:
          "大きな地震でも建物が倒壊せず、人が避難できることを目指した基準です。大きく傷むことはあります。",
      },
      post_2000: {
        label: "2000年基準",
        years: "2000年6月以降の建築確認",
        description:
          "木造住宅では、地盤の確認、接合部の強化、壁のバランスが追加で求められます。鉄筋コンクリートのマンションは、主に1981年の基準で判断します。",
      },
    } satisfies Record<SeismicEra, { label: string; years: string; description: string }>,
    caveat1981: "1981年基準は、1981年6月以降の建築確認に適用されます。",
    caveat2000: "2000年基準は、2000年6月以降の建築確認に適用されます。",
  },
} as const;

export type Copy = (typeof copy)[Lang];

export function messages(lang: Lang): Copy {
  return copy[lang];
}

export function depthLabel(reading: DepthReading, t: Copy): string {
  if (reading.status === "error") return t.tileError;
  if (reading.status === "no_data" || reading.inZone == null) return t.noTile;
  if (!reading.inZone) return t.notColoured;
  if (reading.depthClass) return t.depth[reading.depthClass];
  return t.depthUnknown;
}

export function zoneLabel(flag: FlagReading, t: Copy): string {
  if (flag.status !== "ok" || flag.inZone == null) return t.noTile;
  if (!flag.inZone) return t.notColoured;
  if (flag.zoneClass) return t.zoneKind[flag.zoneClass];
  return t.inZone;
}

function publishedZoom(flag: FlagReading): number | null {
  for (const line of flag.caveats) {
    const match = line.match(/zoom (\d+)/);
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

export function landslideLine(
  debris: FlagReading,
  steep: FlagReading,
  slide: FlagReading,
  t: Copy,
): string {
  const layers: Array<[string, FlagReading]> = [
    [t.debrisFlow, debris],
    [t.steepSlope, steep],
    [t.landslideZone, slide],
  ];
  const parts: Array<{ kind: "hit" | "clear" | "coarse" | "missing"; text: string }> = [];
  for (const [name, flag] of layers) {
    const zoom = publishedZoom(flag);
    if (flag.status !== "ok" || flag.inZone == null) {
      parts.push({ kind: "missing", text: `${name}: ${t.zoneMissing}` });
      continue;
    }
    if (flag.inZone) {
      const kind = flag.zoneClass ? t.zoneKind[flag.zoneClass] : t.zoneIn;
      const text = zoom == null ? `${name}: ${kind}` : `${name}: ${kind}, ${t.coarseClear(zoom)}`;
      parts.push({ kind: "hit", text });
      continue;
    }
    if (flag.nearbyClass && flag.nearbyMeters != null) {
      const kind = t.zoneKind[flag.nearbyClass];
      const text = zoom == null
        ? `${name}: ${kind}, ${t.nearby(flag.nearbyMeters)}`
        : `${name}: ${kind}, ${t.nearby(flag.nearbyMeters)}, ${t.coarseClear(zoom)}`;
      parts.push({ kind: "hit", text });
      continue;
    }
    if (zoom == null) {
      parts.push({ kind: "clear", text: `${name}: ${t.zoneClear}` });
      continue;
    }
    parts.push({ kind: "coarse", text: `${name}: ${t.coarseClear(zoom)}` });
  }
  const notable = parts.filter((part) => part.kind !== "clear");
  if (notable.length === 0) return `${t.zoneNone}.`;
  const show = notable.some((part) => part.kind === "hit") ? notable : parts;
  return `${show.map((part) => part.text).join(". ")}.`;
}

export function coarseNotes(caveats: string[], t: Copy): string[] {
  return caveats.flatMap((line) => {
    const match = line.match(/zoom (\d+)/);
    return match?.[1] ? [t.coarseTile(Number(match[1]))] : [];
  });
}

export function storedDepth(label: string | null, t: Copy): string {
  if (!label) return "";
  const key = DEPTH_EN[label];
  if (key === "not") return t.notColoured;
  if (key === "none") return t.noTile;
  if (key === "unknown") return t.depthUnknown;
  if (key === "error") return t.tileError;
  if (key) return t.depth[key];
  return label;
}

export function storedEra(label: string | null, t: Copy): string {
  if (!label) return "";
  const key = ERA_EN[label];
  return key ? t.era[key].label : label;
}
