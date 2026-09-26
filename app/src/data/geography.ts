import type { LngLat } from './types';

/**
 * A simplified, hand-made stand-in for Midtown and Museum Park, Houston.
 * Positions are roughly right but streets are idealised to a straight grid,
 * like the design prototype's drawn map. It is NOT real map data.
 */

export const MAP_BOUNDS: [LngLat, LngLat] = [
  [-95.418, 29.678],
  [-95.342, 29.772],
];

/** Where the rider is standing in the sample. */
export const USER_POSITION: LngLat = [-95.3812, 29.7412];

export const GRID = {
  lngStep: 0.00145,
  latStep: 0.0013,
  /** Reference lines the grid is built from. */
  lngOrigin: -95.38,
  latOrigin: 29.7395,
  minLng: -95.418,
  maxLng: -95.342,
  minLat: 29.678,
  maxLat: 29.772,
};

export interface NamedStreet {
  name: string;
  axis: 'ns' | 'ew';
  /** Longitude for north-south streets, latitude for east-west streets. */
  at: number;
  from: number;
  to: number;
}

export const STREETS: NamedStreet[] = [
  { name: 'Main St', axis: 'ns', at: -95.3829, from: 29.713, to: 29.768 },
  { name: 'Fannin St', axis: 'ns', at: -95.38, from: 29.716, to: 29.768 },
  { name: 'Almeda Rd', axis: 'ns', at: -95.3771, from: 29.705, to: 29.768 },
  { name: 'Montrose Blvd', axis: 'ns', at: -95.3945, from: 29.7235, to: 29.768 },
  { name: 'San Jacinto St', axis: 'ns', at: -95.37275, from: 29.705, to: 29.768 },
  { name: 'Tuam St', axis: 'ew', at: 29.7447, from: -95.418, to: -95.342 },
  { name: 'Alabama St', axis: 'ew', at: 29.7395, from: -95.418, to: -95.342 },
  { name: 'Elgin St', axis: 'ew', at: 29.7343, from: -95.418, to: -95.342 },
  { name: 'Binz St', axis: 'ew', at: 29.7291, from: -95.418, to: -95.342 },
  { name: 'Southmore Blvd', axis: 'ew', at: 29.7239, from: -95.398, to: -95.342 },
  { name: 'Gray St', axis: 'ew', at: 29.7525, from: -95.418, to: -95.342 },
  { name: 'Hermann Park Dr', axis: 'ew', at: 29.7185, from: -95.3875, to: -95.3771 },
];

export const HIGHWAY_69: LngLat[] = [
  [-95.418, 29.7309],
  [-95.4, 29.7336],
  [-95.39, 29.7362],
  [-95.382, 29.7384],
  [-95.374, 29.741],
  [-95.366, 29.7445],
  [-95.358, 29.7488],
  [-95.342, 29.7579],
];

export const BUFFALO_BAYOU: LngLat[] = [
  [-95.418, 29.7634],
  [-95.402, 29.7612],
  [-95.394, 29.7631],
  [-95.386, 29.7618],
  [-95.378, 29.7642],
  [-95.37, 29.7629],
  [-95.36, 29.7652],
  [-95.342, 29.7636],
];

export const HERMANN_PARK: LngLat[] = [
  [-95.3985, 29.7228],
  [-95.3862, 29.7228],
  [-95.3838, 29.7165],
  [-95.3848, 29.7085],
  [-95.3995, 29.7088],
  [-95.4008, 29.7162],
  [-95.3985, 29.7228],
];

export const ZOO_GROUNDS: LngLat[] = [
  [-95.3948, 29.7172],
  [-95.3872, 29.7172],
  [-95.3866, 29.7112],
  [-95.3942, 29.7108],
  [-95.3948, 29.7172],
];

export const MCGOVERN_LAKE: LngLat[] = [
  [-95.3925, 29.7208],
  [-95.3885, 29.7212],
  [-95.3874, 29.7194],
  [-95.3902, 29.7186],
  [-95.3928, 29.7195],
  [-95.3925, 29.7208],
];

export const DISTRICT_LABELS: { name: string; position: LngLat }[] = [
  { name: 'MIDTOWN', position: [-95.3765, 29.7462] },
  { name: 'MUSEUM PARK', position: [-95.3895, 29.7302] },
  { name: 'HERMANN PARK', position: [-95.3955, 29.7212] },
];
