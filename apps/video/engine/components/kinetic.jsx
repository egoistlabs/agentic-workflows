// R7: a headline that builds word by word. Pass `at` (start, scene seconds)
// and `step`, or `times` per word to sync to VO word timings.
import { useBrand, useTime } from '../context.jsx';
import { p } from '../motion.js';

export const KineticHeadline = ({ text, at = 0, step = 0.18, times, accent = [], size = 96, align = 'center', dimPast = false, style }) => {
  const brand = useBrand();
  const { t } = useTime();
  const words = text.split(/\s+/);
  const last = words.reduce((n, _, i) => (t >= (times?.[i] ?? at + i * step) ? i : n), -1);
  return (
    <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', textAlign: align, ...style }}>
      {words.map((w, i) => {
        const k = p(t, times?.[i] ?? at + i * step, (times?.[i] ?? at + i * step) + 0.35);
        const hot = accent.includes(i) || accent.includes(w.replace(/[^\w$€£₱%]/g, ''));
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: '0.25em', opacity: k * (dimPast && i < last ? 0.55 : 1), transform: `translateY(${(1 - k) * 0.35}em)`, filter: `blur(${(1 - k) * 8}px)`, color: hot ? (brand.accent ?? '#22d3ee') : undefined }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};
