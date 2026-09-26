import { DOWNTOWN } from "../lib/geo.ts";

/** The OpenFreeMap base style. F0b overrides its paints to the --c-map-* tokens (C.16). */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const LABEL_FONT = ["Noto Sans Regular"];

export const DEFAULT_CAMERA = { center: [DOWNTOWN.lon, DOWNTOWN.lat] as [number, number], zoom: 14 };
/** Zoom 16 shows the ID labels of the pins nearest the rider (M4). */
export const USER_ZOOM = 16;
