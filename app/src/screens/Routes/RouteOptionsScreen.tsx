import { useRouter } from '../../app/router';
import { IconButton } from '../../components/ui';

/** Placeholder. Replaced by the Route options screen task in PROGRESS.md. */
export function RouteOptionsScreen(_props: { placeId: string }) {
  const { back } = useRouter();
  return (
    <div className="map-overlay">
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <IconButton icon="chevron-left" label="Back" onClick={() => back()} />
        <h1 className="t-title glass-strong" style={{ padding: '8px 16px', borderRadius: 999 }}>
          Route options
        </h1>
      </div>
    </div>
  );
}
