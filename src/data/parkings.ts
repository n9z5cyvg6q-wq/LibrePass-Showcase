export interface Parking {
  id: string;
  name: string;
  lat: number;
  lng: number;
  total_capacity: number;
  available_spaces: number;
  price_per_hour: number;
  is_outdoor: boolean;
  has_ev_charging: boolean;
  address: string;
  splat_source_url?: string | null;
}

export const mockParkings: Parking[] = [
  {
    id: "1",
    name: "Parking Riponne",
    lat: 46.5234,
    lng: 6.6328,
    total_capacity: 480,
    available_spaces: 45,
    price_per_hour: 3.5,
    is_outdoor: false,
    has_ev_charging: true,
    address: "Place de la Riponne 1, 1005 Lausanne",
  },
  {
    id: "2",
    name: "Parking Bellefontaine",
    lat: 46.5178,
    lng: 6.6302,
    total_capacity: 200,
    available_spaces: 8,
    price_per_hour: 2.8,
    is_outdoor: false,
    has_ev_charging: false,
    address: "Av. de Bellefontaine, 1003 Lausanne",
  },
  {
    id: "3",
    name: "Parking Mon-Repos",
    lat: 46.5262,
    lng: 6.6395,
    total_capacity: 350,
    available_spaces: 0,
    price_per_hour: 3.0,
    is_outdoor: false,
    has_ev_charging: true,
    address: "Av. Mon-Repos, 1005 Lausanne",
  },
  {
    id: "4",
    name: "P+R Vennes",
    lat: 46.5336,
    lng: 6.6588,
    total_capacity: 600,
    available_spaces: 120,
    price_per_hour: 1.5,
    is_outdoor: true,
    has_ev_charging: true,
    address: "Route de Berne, 1010 Lausanne",
  },
  {
    id: "5",
    name: "Parking Navigation",
    lat: 46.5087,
    lng: 6.6271,
    total_capacity: 300,
    available_spaces: 15,
    price_per_hour: 4.0,
    is_outdoor: false,
    has_ev_charging: false,
    address: "Place de la Navigation, 1006 Lausanne",
  },
  {
    id: "6",
    name: "Parking Chauderon",
    lat: 46.5218,
    lng: 6.6242,
    total_capacity: 150,
    available_spaces: 3,
    price_per_hour: 3.2,
    is_outdoor: false,
    has_ev_charging: true,
    address: "Place Chauderon, 1003 Lausanne",
  },
];

export const getAvailabilityColor = (spaces: number, totalCapacity?: number): string => {
  if (spaces === 0) return "#C8191E";
  const pct = totalCapacity ? (spaces / totalCapacity) * 100 : -1;
  if (pct >= 0) {
    if (pct < 15) return "#F59E0B";
    return "#22C55E";
  }
  // Fallback for missing capacity
  if (spaces < 10) return "#F59E0B";
  return "#22C55E";
};

export const getAvailabilityLabel = (spaces: number, totalCapacity?: number): string => {
  if (spaces === 0) return "Full";
  const pct = totalCapacity ? (spaces / totalCapacity) * 100 : -1;
  if (pct >= 0) {
    if (pct < 15) return "Limited";
    return "Available";
  }
  if (spaces < 10) return "Limited";
  return "Available";
};
