// Static FIFA ranking fallback (lower number = stronger). Only a final
// tiebreaker when points / GD / GF / discipline are all equal.
//
// Keyed primarily by FIFA 3-letter code (stable across display languages), with
// an English-name fallback for sources/tests that don't carry a code.

const BY_CODE: Record<string, number> = {
  ARG: 1, ESP: 2, FRA: 3, ENG: 4, BRA: 5, POR: 6, NED: 7, BEL: 8, GER: 9,
  CRO: 10, MAR: 12, COL: 13, URU: 14, USA: 15, MEX: 16, SUI: 17, JPN: 18,
  SEN: 19, IRN: 21, KOR: 23, AUS: 24, ECU: 25, AUT: 26, KSA: 27, CAN: 28,
  SWE: 29, EGY: 33, PAN: 34, NOR: 35, CIV: 37, NGA: 38, QAT: 39, ALG: 40,
  SCO: 41, TUR: 42, CZE: 43, PAR: 45, TUN: 46, GHA: 49, RSA: 50, JOR: 51,
  NZL: 52, UZB: 53, COD: 56, IRQ: 58, BIH: 74, CPV: 70, CUW: 82, HAI: 83,
};

const BY_NAME: Record<string, number> = {
  argentina: 1, spain: 2, france: 3, england: 4, brazil: 5, portugal: 6,
  netherlands: 7, belgium: 8, germany: 9, croatia: 10, italy: 11, morocco: 12,
  colombia: 13, uruguay: 14, "united states": 15, usa: 15, mexico: 16,
  switzerland: 17, japan: 18, senegal: 19, denmark: 20, iran: 21,
  "south korea": 23, korea: 23, "korea republic": 23, australia: 24, ecuador: 25,
  austria: 26, "saudi arabia": 27, canada: 28, sweden: 29, poland: 32, egypt: 33,
  panama: 34, norway: 35, "ivory coast": 37, nigeria: 38, qatar: 39, algeria: 40,
  scotland: 41, turkey: 42, "czech republic": 43, paraguay: 45, tunisia: 46,
  ghana: 49, "south africa": 50, jordan: 51, "new zealand": 52, uzbekistan: 53,
};

const UNKNOWN_RANK = 999;

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Lower is stronger. Accepts a FIFA code (e.g. "KOR") or a country name; unknown
 * teams sort last.
 */
export function fifaRankOf(key: string): number {
  if (!key) return UNKNOWN_RANK;
  const code = BY_CODE[key.toUpperCase()];
  if (code != null) return code;
  return BY_NAME[normalize(key)] ?? UNKNOWN_RANK;
}
