// R4: a real screenshot, UI or document as evidence. Enters with a tilt and
// settles; optional label ("Illustrative example") and caption.
import { Img, staticFile } from 'remotion';
import { useBrand, useTime } from '../context.jsx';
import { Easing, map, p } from '../motion.js';

export const ProofCard = ({ src, at = 0, width = 820, tilt = 8, label, caption, focus, zoom = 1.0, style, children }) => {
  const brand = useBrand();
  const { t } = useTime();
  const k = p(t, at, at + 0.7, Easing.bezier(0.16, 1, 0.3, 1));
  // Slow push-in after landing keeps the frame alive (R3).
  const push = map(t, at + 0.7, at + 6, 1, zoom);
  const origin = focus ? `${focus[0] * 100}% ${focus[1] * 100}%` : 'center';
  return (
    <div style={{ width, opacity: k, transform: `perspective(1600px) rotateX(${(1 - k) * tilt * 2}deg) rotateZ(${(1 - k) * -tilt * 0.4}deg) translateY(${(1 - k) * 80}px)`, ...style }}>
      {label && <div style={{ display: 'inline-block', marginBottom: 14, padding: '6px 14px', borderRadius: 999, fontSize: 26, fontWeight: 700, background: 'rgba(255,255,255,.1)', color: brand.muted ?? '#cbd5e1' }}>{label}</div>}
      <div style={{ borderRadius: 26, overflow: 'hidden', boxShadow: `0 30px 90px rgba(0,0,0,.55), 0 0 0 2px rgba(255,255,255,.08), 0 0 80px ${brand.accentGlow ?? 'rgba(34,211,238,.18)'}` }}>
        {src ? <Img src={staticFile(src)} style={{ width: '100%', display: 'block', transform: `scale(${push})`, transformOrigin: origin }} /> : children}
      </div>
      {caption && <div style={{ marginTop: 18, fontSize: 34, fontWeight: 650, textAlign: 'center' }}>{caption}</div>}
    </div>
  );
};
