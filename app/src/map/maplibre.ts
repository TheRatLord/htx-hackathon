import { setWorkerUrl } from 'maplibre-gl';
// Let Vite bundle MapLibre's worker (and the chunk it imports) so the
// built site works from any static host path.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);

export * from 'maplibre-gl';
