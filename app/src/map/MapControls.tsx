import { useEffect, useState } from 'react';
import { USER_POSITION } from '../data/geography';
import { useReducedMotion } from '../app/hooks';
import { Icon } from '../components/Icon';
import { useMapContext } from './scene';

/** Zoom in/out and "go to my location", floating over the map. */
export function MapControls() {
  const { map, scene, bottomInset } = useMapContext();
  const reducedMotion = useReducedMotion();
  const [viewportH, setViewportH] = useState(() => window.innerHeight);

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!map) return null;
  const top = scene.controlsTop ?? 176;
  const duration = reducedMotion ? 0 : 250;
  // Hide controls the sheet would cover.
  const zoomFits = top + 112 + 16 < viewportH - bottomInset;
  const locateFits = viewportH - bottomInset - 72 > top + 112 + 16;

  return (
    <>
      {zoomFits && (
        <div className="map-zoom glass-strong" style={{ top }}>
          <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn({ duration })}>
            <Icon name="plus" size={24} />
          </button>
          <span className="map-zoom__divider" aria-hidden="true" />
          <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut({ duration })}>
            <Icon name="minus" size={24} />
          </button>
        </div>
      )}
      {locateFits && (
        <button
          type="button"
          className="map-locate glass-strong"
          style={{ bottom: bottomInset + 16 }}
          aria-label="Show my location"
          onClick={() =>
            map.easeTo({ center: USER_POSITION, zoom: Math.max(map.getZoom(), 15.2), duration: reducedMotion ? 0 : 500 })
          }
        >
          <Icon name="locate" size={24} />
        </button>
      )}
    </>
  );
}
