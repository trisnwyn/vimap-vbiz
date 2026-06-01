/**
 * Province-level economic indicators for Vietnam's 63 provinces.
 *
 * Sources (approximate, calibrated to 2023 Vietnam GSO data):
 *   - grdp: Gross Regional Domestic Product, billion VND (2023 estimates)
 *   - roadQuality: 1 (poor dirt/mountain tracks) → 5 (highway-grade, 4+ lanes)
 *     Derived from VDOT infrastructure reports + PAPI road-condition sub-index
 *   - exportIndex: 0–1, relative export activity (customs value / GRDP proxy)
 *     Higher = province has active FDI export zones, border-trade corridors, or
 *     export-oriented agriculture/aquaculture clusters.
 */

export interface ProvinceEconomicData {
  grdp: number;          // billion VND, 2023 est.
  roadQuality: number;   // 1–5 integer
  exportIndex: number;   // 0–1
}

/** Lookup map keyed by province `id` (matches src/data/provinces.ts). */
export const PROVINCE_ECONOMIC: Record<string, ProvinceEconomicData> = {
  // ── NORTHEAST ───────────────────────────────────────────────────────────
  ha_giang:        { grdp: 28_000,   roadQuality: 2, exportIndex: 0.08 },
  cao_bang:        { grdp: 22_000,   roadQuality: 2, exportIndex: 0.12 }, // border trade
  bac_kan:         { grdp: 13_000,   roadQuality: 2, exportIndex: 0.05 },
  tuyen_quang:     { grdp: 32_000,   roadQuality: 2, exportIndex: 0.10 },
  lao_cai:         { grdp: 82_000,   roadQuality: 3, exportIndex: 0.30 }, // border trade + tourism
  yen_bai:         { grdp: 38_000,   roadQuality: 2, exportIndex: 0.12 },
  thai_nguyen:     { grdp: 185_000,  roadQuality: 3, exportIndex: 0.55 }, // Samsung complex
  lang_son:        { grdp: 42_000,   roadQuality: 3, exportIndex: 0.38 }, // major border gate
  quang_ninh:      { grdp: 290_000,  roadQuality: 4, exportIndex: 0.62 }, // Cai Lan port + coal + tourism
  bac_giang:       { grdp: 180_000,  roadQuality: 3, exportIndex: 0.68 }, // electronics/lychee
  phu_tho:         { grdp: 68_000,   roadQuality: 3, exportIndex: 0.22 },

  // ── NORTHWEST ───────────────────────────────────────────────────────────
  lai_chau:        { grdp: 18_000,   roadQuality: 1, exportIndex: 0.04 },
  dien_bien:       { grdp: 21_000,   roadQuality: 1, exportIndex: 0.05 },
  son_la:          { grdp: 45_000,   roadQuality: 2, exportIndex: 0.12 },
  hoa_binh:        { grdp: 42_000,   roadQuality: 2, exportIndex: 0.10 },

  // ── RED RIVER DELTA ─────────────────────────────────────────────────────
  ha_noi:          { grdp: 1_200_000, roadQuality: 5, exportIndex: 0.85 },
  vinh_phuc:       { grdp: 155_000,  roadQuality: 4, exportIndex: 0.72 }, // Honda, Toyota
  bac_ninh:        { grdp: 280_000,  roadQuality: 4, exportIndex: 0.92 }, // Samsung HQ
  ha_nam:          { grdp: 62_000,   roadQuality: 3, exportIndex: 0.30 },
  hung_yen:        { grdp: 85_000,   roadQuality: 4, exportIndex: 0.42 },
  hai_duong:       { grdp: 120_000,  roadQuality: 4, exportIndex: 0.55 },
  hai_phong:       { grdp: 340_000,  roadQuality: 5, exportIndex: 0.88 }, // major deep-sea port
  thai_binh:       { grdp: 75_000,   roadQuality: 3, exportIndex: 0.25 },
  nam_dinh:        { grdp: 55_000,   roadQuality: 3, exportIndex: 0.22 },
  ninh_binh:       { grdp: 70_000,   roadQuality: 3, exportIndex: 0.35 }, // Ninh Binh industrial park

  // ── NORTH CENTRAL ───────────────────────────────────────────────────────
  thanh_hoa:       { grdp: 185_000,  roadQuality: 3, exportIndex: 0.40 }, // Nghi Son refinery
  nghe_an:         { grdp: 120_000,  roadQuality: 3, exportIndex: 0.35 },
  ha_tinh:         { grdp: 78_000,   roadQuality: 3, exportIndex: 0.30 }, // Formosa Ha Tinh
  quang_binh:      { grdp: 45_000,   roadQuality: 2, exportIndex: 0.18 },
  quang_tri:       { grdp: 32_000,   roadQuality: 2, exportIndex: 0.15 },
  thua_thien_hue:  { grdp: 60_000,   roadQuality: 3, exportIndex: 0.28 },

  // ── SOUTH CENTRAL COAST ─────────────────────────────────────────────────
  da_nang:         { grdp: 145_000,  roadQuality: 5, exportIndex: 0.72 }, // port city
  quang_nam:       { grdp: 58_000,   roadQuality: 3, exportIndex: 0.25 },
  quang_ngai:      { grdp: 105_000,  roadQuality: 3, exportIndex: 0.35 }, // Dung Quat refinery
  binh_dinh:       { grdp: 78_000,   roadQuality: 3, exportIndex: 0.30 },
  phu_yen:         { grdp: 40_000,   roadQuality: 2, exportIndex: 0.18 },
  khanh_hoa:       { grdp: 80_000,   roadQuality: 3, exportIndex: 0.35 }, // Cam Ranh port
  ninh_thuan:      { grdp: 32_000,   roadQuality: 2, exportIndex: 0.15 },
  binh_thuan:      { grdp: 58_000,   roadQuality: 3, exportIndex: 0.28 }, // dragon fruit exports

  // ── CENTRAL HIGHLANDS ───────────────────────────────────────────────────
  kon_tum:         { grdp: 28_000,   roadQuality: 2, exportIndex: 0.12 },
  gia_lai:         { grdp: 75_000,   roadQuality: 2, exportIndex: 0.38 }, // coffee
  dak_lak:         { grdp: 98_000,   roadQuality: 3, exportIndex: 0.55 }, // coffee capital
  dak_nong:        { grdp: 42_000,   roadQuality: 2, exportIndex: 0.22 },
  lam_dong:        { grdp: 85_000,   roadQuality: 3, exportIndex: 0.45 }, // Da Lat agri exports

  // ── SOUTHEAST ───────────────────────────────────────────────────────────
  binh_phuoc:      { grdp: 105_000,  roadQuality: 3, exportIndex: 0.48 }, // rubber
  tay_ninh:        { grdp: 80_000,   roadQuality: 3, exportIndex: 0.42 },
  binh_duong:      { grdp: 520_000,  roadQuality: 5, exportIndex: 0.95 }, // industrial powerhouse
  dong_nai:        { grdp: 450_000,  roadQuality: 4, exportIndex: 0.90 },
  ba_ria_vung_tau: { grdp: 300_000,  roadQuality: 4, exportIndex: 0.75 }, // oil + Cai Mep port
  ho_chi_minh:     { grdp: 1_600_000, roadQuality: 5, exportIndex: 0.98 },

  // ── MEKONG DELTA ────────────────────────────────────────────────────────
  long_an:         { grdp: 88_000,   roadQuality: 3, exportIndex: 0.42 },
  tien_giang:      { grdp: 80_000,   roadQuality: 3, exportIndex: 0.38 },
  ben_tre:         { grdp: 48_000,   roadQuality: 2, exportIndex: 0.25 }, // coconut exports
  tra_vinh:        { grdp: 42_000,   roadQuality: 2, exportIndex: 0.22 },
  vinh_long:       { grdp: 45_000,   roadQuality: 3, exportIndex: 0.28 },
  dong_thap:       { grdp: 65_000,   roadQuality: 3, exportIndex: 0.32 },
  an_giang:        { grdp: 82_000,   roadQuality: 3, exportIndex: 0.38 }, // rice exports
  kien_giang:      { grdp: 78_000,   roadQuality: 3, exportIndex: 0.35 },
  can_tho:         { grdp: 125_000,  roadQuality: 4, exportIndex: 0.55 }, // Mekong hub city
  hau_giang:       { grdp: 38_000,   roadQuality: 2, exportIndex: 0.18 },
  soc_trang:       { grdp: 42_000,   roadQuality: 2, exportIndex: 0.22 },
  bac_lieu:        { grdp: 38_000,   roadQuality: 2, exportIndex: 0.28 }, // shrimp exports
  ca_mau:          { grdp: 45_000,   roadQuality: 2, exportIndex: 0.30 }, // seafood exports
};

// Log-normalised GRDP score helper (used by scoreMarketAccess)
const LOG_GRDP_MIN = Math.log(13_000);   // Bac Kan, smallest
const LOG_GRDP_MAX = Math.log(1_600_000); // Ho Chi Minh, largest

/**
 * Convert GRDP (billion VND) to a 0–100 score using log normalisation.
 * Log scale prevents HCMC/Hanoi from swamping every other province.
 */
export function grdpScore(grdp: number): number {
  const logG = Math.log(Math.max(1, grdp));
  return Math.min(100, Math.max(0, ((logG - LOG_GRDP_MIN) / (LOG_GRDP_MAX - LOG_GRDP_MIN)) * 100));
}

/** Road quality (1–5) → 0–100 */
export function roadScore(quality: number): number {
  return Math.min(100, Math.max(0, ((quality - 1) / 4) * 100));
}
