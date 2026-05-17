import type { ForestLossPoint } from '@/types';

function scatter(baseLat: number, baseLng: number, count: number, radius: number, yearRange: [number, number], cause: string): ForestLossPoint[] {
  const points: ForestLossPoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i * 137.508 * Math.PI / 180);
    const r = radius * Math.sqrt((i + 1) / count);
    points.push({
      id: `fl_${baseLat.toFixed(0)}_${baseLng.toFixed(0)}_${i}`,
      lat: baseLat + r * Math.cos(angle),
      lng: baseLng + r * Math.sin(angle),
      year: yearRange[0] + Math.floor((i / count) * (yearRange[1] - yearRange[0] + 1)),
      intensity: 0.3 + Math.random() * 0.7,
      cause,
    });
  }
  return points;
}

// Secondary scatter with offset IDs to avoid collisions
function scatter2(baseLat: number, baseLng: number, count: number, radius: number, yearRange: [number, number], cause: string, tag: string): ForestLossPoint[] {
  const points: ForestLossPoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i * 137.508 * Math.PI / 180) + 0.5;
    const r = radius * Math.sqrt((i + 1) / count);
    points.push({
      id: `fl2_${tag}_${i}`,
      lat: baseLat + r * Math.cos(angle),
      lng: baseLng + r * Math.sin(angle),
      year: yearRange[0] + Math.floor((i / count) * (yearRange[1] - yearRange[0] + 1)),
      intensity: 0.2 + Math.random() * 0.8,
      cause,
    });
  }
  return points;
}

export const forestLossPoints: ForestLossPoint[] = [
  // ===================================================================
  // CENTRAL HIGHLANDS — coffee & rubber expansion (heaviest loss zone)
  // ===================================================================
  // Dak Lak core — massive coffee expansion
  ...scatter(12.71, 108.05, 90, 0.7, [2001, 2024], 'coffee_expansion'),
  ...scatter2(12.65, 108.20, 55, 0.5, [2003, 2024], 'coffee_expansion', 'dklk_e'),
  ...scatter2(12.80, 107.90, 45, 0.45, [2001, 2020], 'coffee_expansion', 'dklk_w'),
  ...scatter(12.55, 108.35, 35, 0.4, [2005, 2024], 'coffee_expansion'),
  // Dak Lak south — rubber transition
  ...scatter(12.40, 107.85, 65, 0.55, [2003, 2022], 'coffee_expansion'),
  ...scatter2(12.35, 108.10, 40, 0.4, [2004, 2023], 'rubber_expansion', 'dklk_s'),
  // Dak Nong — severe coffee/pepper expansion
  ...scatter(12.00, 107.69, 75, 0.6, [2002, 2024], 'rubber_expansion'),
  ...scatter2(11.90, 107.55, 50, 0.5, [2001, 2023], 'coffee_expansion', 'dkng_w'),
  ...scatter2(12.10, 107.80, 40, 0.4, [2005, 2024], 'pepper_expansion', 'dkng_e'),
  ...scatter(11.85, 107.72, 30, 0.35, [2003, 2021], 'coffee_expansion'),
  // Gia Lai — coffee heartland
  ...scatter(13.98, 108.00, 70, 0.7, [2001, 2023], 'coffee_expansion'),
  ...scatter2(14.10, 107.85, 50, 0.55, [2002, 2024], 'coffee_expansion', 'glai_n'),
  ...scatter2(13.85, 108.20, 40, 0.45, [2003, 2022], 'rubber_expansion', 'glai_e'),
  ...scatter(13.75, 107.90, 35, 0.4, [2004, 2023], 'coffee_expansion'),
  // Kon Tum — rubber & cassava expansion
  ...scatter(14.35, 107.98, 55, 0.6, [2003, 2024], 'rubber_expansion'),
  ...scatter2(14.50, 107.80, 40, 0.5, [2001, 2022], 'cassava_expansion', 'ktum_n'),
  ...scatter2(14.25, 108.15, 30, 0.4, [2005, 2023], 'rubber_expansion', 'ktum_e'),
  ...scatter(14.45, 108.10, 25, 0.35, [2002, 2021], 'logging'),
  // Between Gia Lai and Kon Tum
  ...scatter(13.50, 107.80, 50, 0.5, [2004, 2021], 'rubber_expansion'),
  ...scatter2(13.60, 108.05, 35, 0.4, [2003, 2023], 'coffee_expansion', 'gk_mid'),
  // Lam Dong — coffee and tourism pressure
  ...scatter(11.94, 108.44, 45, 0.5, [2005, 2023], 'coffee_expansion'),
  ...scatter2(11.80, 108.30, 30, 0.4, [2003, 2022], 'urbanization', 'ldong_s'),
  ...scatter2(12.05, 108.55, 25, 0.35, [2006, 2024], 'coffee_expansion', 'ldong_e'),
  ...scatter(11.98, 108.20, 20, 0.3, [2004, 2021], 'logging'),

  // ===================================================================
  // SOUTHEAST — rubber belt + industrial conversion
  // ===================================================================
  // Binh Phuoc — major rubber province
  ...scatter(11.75, 106.72, 60, 0.5, [2001, 2022], 'rubber_expansion'),
  ...scatter2(11.85, 106.85, 40, 0.4, [2002, 2024], 'rubber_expansion', 'bphuoc_n'),
  ...scatter2(11.65, 106.60, 35, 0.35, [2003, 2023], 'cashew_expansion', 'bphuoc_s'),
  ...scatter(11.80, 106.55, 25, 0.3, [2005, 2021], 'industrial'),
  // Tay Ninh — rubber and industrial zones
  ...scatter(11.31, 106.10, 35, 0.35, [2002, 2020], 'rubber_expansion'),
  ...scatter2(11.40, 106.20, 25, 0.3, [2003, 2022], 'industrial', 'tninh_n'),
  // Dong Nai — mixed use conversion
  ...scatter(11.05, 107.17, 40, 0.4, [2001, 2021], 'rubber_expansion'),
  ...scatter2(11.15, 107.30, 30, 0.35, [2002, 2023], 'industrial', 'dnai_ne'),
  ...scatter2(10.95, 107.05, 25, 0.3, [2004, 2022], 'urbanization', 'dnai_sw'),
  // Binh Duong — urbanization pressure
  ...scatter(11.17, 106.65, 30, 0.25, [2003, 2019], 'industrial'),
  ...scatter2(11.10, 106.70, 20, 0.2, [2005, 2024], 'urbanization', 'bduong_u'),
  // Ba Ria-Vung Tau
  ...scatter2(10.50, 107.25, 20, 0.25, [2003, 2021], 'industrial', 'brvt'),
  // HCMC peri-urban
  ...scatter2(10.75, 106.50, 15, 0.2, [2005, 2024], 'urbanization', 'hcm_w'),

  // ===================================================================
  // NORTHWEST — slash-and-burn, hydropower, shifting cultivation
  // ===================================================================
  // Lai Chau — shifting cultivation core
  ...scatter(22.39, 103.47, 55, 0.6, [2001, 2024], 'shifting_cultivation'),
  ...scatter2(22.50, 103.30, 35, 0.5, [2002, 2023], 'shifting_cultivation', 'lchau_n'),
  ...scatter2(22.25, 103.60, 30, 0.4, [2003, 2022], 'rubber_expansion', 'lchau_s'),
  // Dien Bien — shifting cultivation + hydropower
  ...scatter(21.39, 103.02, 50, 0.55, [2001, 2023], 'shifting_cultivation'),
  ...scatter2(21.50, 103.15, 30, 0.45, [2002, 2024], 'hydropower', 'dbien_n'),
  ...scatter2(21.25, 102.90, 25, 0.4, [2004, 2022], 'shifting_cultivation', 'dbien_s'),
  // Son La — hydropower + maize expansion
  ...scatter(21.33, 103.89, 50, 0.65, [2001, 2022], 'hydropower'),
  ...scatter2(21.45, 104.10, 35, 0.5, [2002, 2024], 'maize_expansion', 'sla_ne'),
  ...scatter2(21.20, 103.70, 30, 0.4, [2003, 2023], 'shifting_cultivation', 'sla_sw'),
  ...scatter(21.10, 104.00, 20, 0.35, [2005, 2021], 'hydropower'),
  // Lao Cai — cardamom + shifting cultivation
  ...scatter(22.34, 103.97, 40, 0.5, [2002, 2024], 'shifting_cultivation'),
  ...scatter2(22.45, 104.10, 25, 0.4, [2003, 2023], 'cardamom_cultivation', 'lcai_n'),
  // Hoa Binh — hydropower reservoir
  ...scatter2(20.82, 105.20, 25, 0.35, [2001, 2020], 'hydropower', 'hbinh'),
  ...scatter2(20.90, 105.45, 20, 0.3, [2003, 2022], 'shifting_cultivation', 'hbinh_e'),
  // Yen Bai
  ...scatter2(21.72, 104.70, 20, 0.35, [2002, 2021], 'shifting_cultivation', 'ybai'),

  // ===================================================================
  // MEKONG DELTA — mangrove loss for aquaculture
  // ===================================================================
  // Ca Mau — mangrove-shrimp conversion epicenter
  ...scatter(9.18, 105.15, 50, 0.4, [2001, 2023], 'aquaculture'),
  ...scatter2(9.05, 105.00, 35, 0.35, [2002, 2024], 'aquaculture', 'cmau_s'),
  ...scatter2(9.30, 105.25, 25, 0.3, [2003, 2022], 'aquaculture', 'cmau_n'),
  ...scatter(9.10, 104.85, 20, 0.25, [2004, 2021], 'aquaculture'),
  // Bac Lieu — shrimp farms
  ...scatter(9.29, 105.72, 30, 0.3, [2003, 2020], 'aquaculture'),
  ...scatter2(9.20, 105.65, 20, 0.25, [2004, 2023], 'aquaculture', 'blieu_s'),
  // Kien Giang — mangrove & rice
  ...scatter(10.01, 105.08, 30, 0.3, [2002, 2021], 'aquaculture'),
  ...scatter2(9.90, 104.95, 20, 0.25, [2003, 2023], 'aquaculture', 'kgiang_s'),
  ...scatter2(10.10, 105.20, 15, 0.2, [2005, 2022], 'rice_expansion', 'kgiang_n'),
  // Soc Trang — coastal mangrove
  ...scatter2(9.55, 106.10, 15, 0.2, [2003, 2021], 'aquaculture', 'strang'),
  // Tra Vinh — coastal
  ...scatter2(9.85, 106.45, 12, 0.18, [2004, 2022], 'aquaculture', 'tvinh'),

  // ===================================================================
  // NORTH CENTRAL COAST — logging + rubber
  // ===================================================================
  // Nghe An — major logging province
  ...scatter(19.23, 104.92, 45, 0.6, [2001, 2022], 'logging'),
  ...scatter2(19.35, 105.10, 30, 0.5, [2002, 2024], 'logging', 'nan_n'),
  ...scatter2(19.10, 104.75, 25, 0.45, [2003, 2023], 'shifting_cultivation', 'nan_w'),
  ...scatter(19.00, 105.20, 20, 0.35, [2004, 2021], 'logging'),
  // Thanh Hoa — timber & conversion
  ...scatter(19.81, 105.78, 35, 0.5, [2002, 2023], 'logging'),
  ...scatter2(19.90, 105.50, 25, 0.4, [2003, 2024], 'logging', 'thoa_w'),
  ...scatter2(19.70, 105.90, 20, 0.35, [2001, 2022], 'timber_harvesting', 'thoa_e'),
  // Quang Binh — selective logging
  ...scatter(17.47, 106.60, 30, 0.45, [2003, 2021], 'logging'),
  ...scatter2(17.60, 106.45, 20, 0.4, [2002, 2023], 'logging', 'qbinh_n'),
  // Ha Tinh
  ...scatter2(18.34, 105.75, 20, 0.35, [2003, 2022], 'logging', 'htinh'),
  // Quang Tri — rubber expansion
  ...scatter(16.75, 107.19, 30, 0.35, [2005, 2022], 'rubber_expansion'),
  ...scatter2(16.85, 107.05, 20, 0.3, [2004, 2023], 'rubber_expansion', 'qtri_n'),
  // Thua Thien Hue — selective logging & rubber
  ...scatter(16.47, 107.59, 20, 0.3, [2006, 2021], 'logging'),
  ...scatter2(16.55, 107.40, 15, 0.25, [2005, 2023], 'rubber_expansion', 'hue_w'),

  // ===================================================================
  // SOUTH CENTRAL COAST — timber & encroachment
  // ===================================================================
  // Quang Nam — logging frontier
  ...scatter2(15.57, 107.65, 30, 0.45, [2002, 2023], 'logging', 'qnam'),
  ...scatter2(15.45, 107.80, 20, 0.35, [2003, 2022], 'hydropower', 'qnam_s'),
  // Quang Ngai
  ...scatter2(15.12, 108.65, 20, 0.3, [2003, 2021], 'logging', 'qngai'),
  // Binh Dinh
  ...scatter2(13.99, 108.85, 20, 0.3, [2004, 2022], 'logging', 'bdinh'),
  ...scatter2(14.10, 108.70, 15, 0.25, [2005, 2023], 'cassava_expansion', 'bdinh_w'),
  // Phu Yen
  ...scatter2(13.09, 108.95, 18, 0.28, [2003, 2021], 'logging', 'pyen'),
  // Khanh Hoa
  ...scatter2(12.26, 108.90, 15, 0.25, [2004, 2022], 'urbanization', 'khoa'),
  // Binh Thuan — dragon fruit encroachment
  ...scatter2(10.93, 107.95, 20, 0.3, [2003, 2022], 'agriculture_expansion', 'bthuan'),
  ...scatter2(11.05, 108.20, 15, 0.25, [2005, 2023], 'urbanization', 'bthuan_e'),

  // ===================================================================
  // NORTHEAST — scattered low-intensity loss
  // ===================================================================
  // Ha Giang — rocky terrain shifting cultivation
  ...scatter2(22.82, 104.80, 20, 0.4, [2002, 2022], 'shifting_cultivation', 'hgiang'),
  // Cao Bang
  ...scatter2(22.67, 106.10, 15, 0.35, [2003, 2021], 'shifting_cultivation', 'cbang'),
  // Lang Son — border area logging
  ...scatter2(21.85, 106.60, 15, 0.3, [2004, 2022], 'logging', 'lson'),
  // Quang Ninh — mining & development
  ...scatter2(21.00, 107.10, 20, 0.35, [2002, 2023], 'mining', 'qninh'),
  ...scatter2(21.15, 107.40, 15, 0.25, [2005, 2022], 'urbanization', 'qninh_e'),
  // Bac Kan — reforestation area (low intensity)
  ...scatter2(22.15, 105.70, 10, 0.25, [2003, 2020], 'shifting_cultivation', 'bkan'),
  // Tuyen Quang
  ...scatter2(22.00, 105.30, 12, 0.3, [2004, 2021], 'logging', 'tquang'),
  // Phu Tho
  ...scatter2(21.42, 105.00, 10, 0.2, [2005, 2020], 'industrial', 'ptho'),

  // ===================================================================
  // RED RIVER DELTA — urban sprawl (low but visible)
  // ===================================================================
  ...scatter2(21.03, 105.70, 8, 0.15, [2005, 2024], 'urbanization', 'hanoi'),
  ...scatter2(20.84, 106.55, 6, 0.12, [2006, 2023], 'industrial', 'hphong'),
];
