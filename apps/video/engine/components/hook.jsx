// R1: the payoff as text from frame 0.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../context.jsx';
import { map } from '../motion.js';

export const HookTitle = ({ text, sub, until = 2.8, position = 'top' }) => {
  const brand = useBrand();
  const { fps, width } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const opacity = map(t, until - 0.35, until, 1, 0);
  const top = position === 'top' ? '16%' : position === 'center' ? '42%' : '62%';
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: 'absolute', top, left: width * 0.08, right: width * 0.08, textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: brand.hookBg ?? 'rgba(0,0,0,0.72)', color: brand.hookFg ?? '#fff', padding: '18px 28px', borderRadius: 18, fontSize: width * 0.058, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.01em' }}>
          {text}
        </div>
        {sub && <div style={{ marginTop: 14, fontSize: width * 0.032, fontWeight: 600, color: brand.muted ?? '#cbd5e1' }}>{sub}</div>}
      </div>
    </AbsoluteFill>
  );
};
