/** Map pins. Rendered into MapLibre DOM markers by MapView. */

export function StopPin({
  label,
  caption,
  active,
  onClick,
}: {
  label: string;
  caption?: string;
  active: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="stop-pin__circle">{label}</span>
      {caption && <span className="stop-pin__caption tabular">{caption}</span>}
    </>
  );
  const cls = `stop-pin${active ? ' stop-pin--active' : ''}`;
  if (!onClick) return <span className={cls}>{content}</span>;
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-label={`Stop ${label}${caption ? `, ${caption} walk` : ''}`}
      aria-pressed={active}
    >
      {content}
    </button>
  );
}

export function RouteLetterPin({
  label,
  color,
  selected,
  onClick,
}: {
  label: string;
  color: string;
  selected: boolean;
  onClick?: () => void;
}) {
  const cls = `route-pin${selected ? ' route-pin--selected' : ''}`;
  const style = { ['--pin' as string]: color };
  if (!onClick)
    return (
      <span className={cls} style={style}>
        {label}
      </span>
    );
  return (
    <button
      type="button"
      className={cls}
      style={style}
      onClick={onClick}
      aria-label={`Route ${label}`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

export function DestinationPin({ label }: { label: string }) {
  return (
    <span className="dest-pin" role="img" aria-label={`Destination: ${label}`}>
      <span className="dest-pin__dot" />
    </span>
  );
}

export function UserDot() {
  return (
    <span className="user-dot" role="img" aria-label="You are here">
      <span className="user-dot__halo" />
      <span className="user-dot__core" />
    </span>
  );
}
