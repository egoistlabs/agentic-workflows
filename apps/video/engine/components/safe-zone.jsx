// Review overlay: shades the areas platform UI covers on 9:16 (top bar,
// bottom caption/CTA stack, right action rail). Stills only.
import { AbsoluteFill } from 'remotion';

const shade = 'rgba(255,0,80,.22)';
export const SafeZone = () => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8%', background: shade }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '18%', background: shade }} />
    <div style={{ position: 'absolute', top: '40%', bottom: '18%', right: 0, width: '13%', background: shade }} />
  </AbsoluteFill>
);
