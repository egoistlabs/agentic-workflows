// H2: persistent progress marker for list or step structures.
import { useBrand } from '../context.jsx';

export const ProgressMarker = ({ current, total, label, style }) => {
  const brand = useBrand();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontWeight: 700, ...style }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ width: 34, height: 8, borderRadius: 4, background: i < current ? (brand.accent ?? '#22d3ee') : 'rgba(255,255,255,.18)' }} />
        ))}
      </div>
      {label && <span style={{ color: brand.muted ?? '#cbd5e1' }}>{label}</span>}
    </div>
  );
};
