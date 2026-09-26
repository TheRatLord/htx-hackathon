import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { RouterProvider } from '../app/router';
import { StoreProvider, initialState, type AppState } from '../app/store';
import { MapSceneProvider, useMapContext, type MapScene } from '../map/scene';

/**
 * Render a screen with every provider it needs, without the real map
 * (MapLibre needs WebGL, which jsdom lacks). `getScene()` returns the scene
 * the screen last asked the map to show, so tests can check pins and routes.
 */
export function renderScreen(
  ui: ReactElement,
  { state = initialState, hash = '#/' }: { state?: AppState; hash?: string } = {},
): RenderResult & { getScene: () => MapScene } {
  window.history.replaceState(null, '', hash);
  let latest: MapScene = {};
  function SceneSpy() {
    latest = useMapContext().scene;
    return null;
  }
  const result = render(
    <StoreProvider initial={state}>
      <RouterProvider>
        <MapSceneProvider>
          {ui}
          <SceneSpy />
        </MapSceneProvider>
      </RouterProvider>
    </StoreProvider>,
  );
  return Object.assign(result, { getScene: () => latest });
}
