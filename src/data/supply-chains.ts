// Major export ports
export const ports = [
  { id: 'hcm_port', name: 'Ho Chi Minh Port', lat: 10.76, lng: 106.74 },
  { id: 'hai_phong_port', name: 'Hai Phong Port', lat: 20.86, lng: 106.72 },
  { id: 'da_nang_port', name: 'Da Nang Port', lat: 16.07, lng: 108.22 },
];

// Supply chain routes from commodity provinces to ports
export const supplyRoutes = [
  // Coffee — Central Highlands to HCM
  { from: [108.05, 12.71], to: [106.74, 10.76], commodity: 'coffee', province: 'Dak Lak' },
  { from: [107.69, 12.00], to: [106.74, 10.76], commodity: 'coffee', province: 'Dak Nong' },
  { from: [108.00, 13.98], to: [106.74, 10.76], commodity: 'coffee', province: 'Gia Lai' },
  { from: [108.44, 11.94], to: [106.74, 10.76], commodity: 'coffee', province: 'Lam Dong' },
  { from: [107.98, 14.35], to: [108.22, 16.07], commodity: 'coffee', province: 'Kon Tum' },

  // Rubber — Southeast + Central Highlands to HCM
  { from: [106.72, 11.75], to: [106.74, 10.76], commodity: 'rubber', province: 'Binh Phuoc' },
  { from: [106.10, 11.31], to: [106.74, 10.76], commodity: 'rubber', province: 'Tay Ninh' },
  { from: [106.65, 11.17], to: [106.74, 10.76], commodity: 'rubber', province: 'Binh Duong' },
  { from: [107.17, 11.05], to: [106.74, 10.76], commodity: 'rubber', province: 'Dong Nai' },
  { from: [107.19, 16.75], to: [108.22, 16.07], commodity: 'rubber', province: 'Quang Tri' },

  // Timber — North Central to Hai Phong
  { from: [105.78, 19.81], to: [106.72, 20.86], commodity: 'timber', province: 'Thanh Hoa' },
  { from: [104.92, 19.23], to: [106.72, 20.86], commodity: 'timber', province: 'Nghe An' },
  { from: [106.60, 17.47], to: [108.22, 16.07], commodity: 'timber', province: 'Quang Binh' },
  { from: [107.59, 16.47], to: [108.22, 16.07], commodity: 'timber', province: 'Thua Thien Hue' },

  // Shrimp — Mekong Delta to HCM
  { from: [105.15, 9.18], to: [106.74, 10.76], commodity: 'shrimp', province: 'Ca Mau' },
  { from: [105.72, 9.29], to: [106.74, 10.76], commodity: 'shrimp', province: 'Bac Lieu' },
];

export const commodityColors: Record<string, string> = {
  coffee: '#c084fc',
  rubber: '#fb923c',
  timber: '#4ade80',
  shrimp: '#38bdf8',
};
