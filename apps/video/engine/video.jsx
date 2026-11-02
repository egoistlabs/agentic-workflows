// Assembles one video: the footage layer (talking-head; explainer face/split/canvas
// layouts), scene list with dissolve handoffs, hook title, captions, VO and SFX. Scene components come from the
// video's scenes.jsx. A hook with `show: false` is carried by the scenes themselves
// (e.g. a native UI element showing the payoff).
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import scenes from '@scenes';
import { BrandContext, SceneContext, VideoContext } from './context.jsx';
import { segAt } from './layout.jsx';
import { GridGround } from './components/canvas.jsx';
import { Captions } from './components/captions.jsx';
import { HookTitle } from './components/hook.jsx';
import { SafeZone } from './components/safe-zone.jsx';

const FadeIn = ({ frames, children }) => {
  const f = useCurrentFrame();
  const opacity = frames > 0 ? interpolate(f, [0, frames], [0, 1], { extrapolateRight: 'clamp' }) : 1;
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

// One footage clip that holds its last frame once it ends. A transparent clip
// shows its last frame only after the end, or it would ghost under the video.
const Clip = ({ src, last, end, style, transparent = false, name }) => {
  const f = useCurrentFrame();
  return (
    <>
      {last && (!transparent || end === undefined || f >= end) && <Img src={staticFile(last)} style={style} />}
      <Sequence durationInFrames={end} name={name}>
        <OffthreadVideo src={staticFile(src)} muted transparent={transparent} style={style} />
      </Sequence>
    </>
  );
};

/** Room above the head's highest point in the break-out band, for hair and movement. */
const BAND = 40;

// The speaker, muted (the VO is `timeline.audio`), with the per-frame camera
// applied (T1, T2). Two layers: `under` draws the full-frame speaker beneath the
// scenes (talking-head, explainer face beats); `over` draws an explainer's split
// card above the canvas, with the cut-out head breaking out over its edge.
const Footage = ({ footage, fps, layer }) => {
  const f = useCurrentFrame();
  const { height: H } = useVideoConfig();
  const seg = segAt(footage, f / fps);
  const mode = seg?.mode ?? 'face';
  const end = footage.end ? Math.floor(footage.end * fps) : undefined;
  if (mode === 'canvas' || (mode === 'face') !== (layer === 'under')) return null;
  if (mode === 'split' && footage.split) {
    const { card: [cx, cy, cw], radius } = footage.split;
    const v = seg.video ?? { x: cx, y: cy, w: cw, h: H - cy };
    const at = (ox, oy) => ({ position: 'absolute', left: v.x - ox, top: v.y - oy, width: v.w, height: v.h });
    const band = seg.headTop !== undefined ? Math.max(0, seg.headTop - BAND) : cy;
    return (
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: cx, top: cy, width: cw, height: H - cy, overflow: 'hidden', borderRadius: radius }}>
          <Clip src={footage.src} last={footage.last} end={end} style={at(cx, cy)} name="footage" />
        </div>
        {footage.alpha && band < cy && (
          <div style={{ position: 'absolute', left: cx, top: band, width: cw, height: cy + radius - band, overflow: 'hidden' }}>
            <Clip src={footage.alpha} last={footage.alphaLast} end={end} style={at(cx, band)} transparent name="head" />
          </div>
        )}
      </AbsoluteFill>
    );
  }
  const cam = footage.cam?.[Math.min(footage.cam.length - 1, f)];
  const [zoom, sat] = Array.isArray(cam) ? cam : [cam ?? 1, 1];
  const style = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`,
    transformOrigin: footage.origin ?? '50% 30%', filter: sat === 1 ? undefined : `saturate(${sat})` };
  return (
    <AbsoluteFill>
      <Clip src={footage.src} last={footage.last} end={end} style={style} name="footage" />
    </AbsoluteFill>
  );
};

export const MainVideo = ({ timeline, words, brand, face }) => {
  const frame = useCurrentFrame();
  const { fps, duration } = timeline;
  const list = timeline.scenes ?? [];
  const fontFace = [
    brand.fontFile && `@font-face{font-family:BrandFont;src:url(${staticFile(brand.fontFile)});font-weight:100 900;}`,
    brand.fontAccentFile && `@font-face{font-family:AccentFont;src:url(${staticFile(brand.fontAccentFile)});font-style:italic;}`,
  ].filter(Boolean).join('');
  return (
    <BrandContext.Provider value={brand}>
      <VideoContext.Provider value={{ frame, footage: timeline.footage ?? null, face: face ?? null, record: !!timeline.recordZones }}>
        <style>{fontFace}</style>
        <AbsoluteFill style={{ background: brand.bg ?? '#0b0d10', color: brand.fg ?? '#f4f4f5', fontFamily: brand.fontFile ? 'BrandFont, sans-serif' : (brand.font ?? 'Inter, sans-serif') }}>
          {(segAt(timeline.footage, frame / fps)?.mode ?? 'face') !== 'face' && <GridGround />}
          {timeline.footage && <Footage footage={timeline.footage} fps={fps} layer="under" />}
          {list.map((s, i) => {
            const Scene = scenes[s.id];
            if (!Scene) throw new Error(`scenes.jsx has no export for scene "${s.id}"`);
            const next = list[i + 1];
            const end = next ? next.start + (next.blend ?? 0.45) : duration;
            const from = Math.round(s.start * fps);
            return (
              <Sequence key={s.id} from={from} durationInFrames={Math.max(1, Math.round(end * fps) - from)} name={s.id}>
                <SceneContext.Provider value={{ start: s.start, end: next ? next.start : duration, props: s.props ?? {} }}>
                  <FadeIn frames={i === 0 ? 0 : Math.round((s.blend ?? 0.45) * fps)}>
                    <Scene {...(s.props ?? {})} />
                  </FadeIn>
                </SceneContext.Provider>
              </Sequence>
            );
          })}
          {timeline.footage && <Footage footage={timeline.footage} fps={fps} layer="over" />}
          {timeline.hook?.text && timeline.hook.show !== false && (
            <Sequence durationInFrames={Math.round((timeline.hook.until ?? 2.8) * fps)} name="hook">
              <HookTitle {...timeline.hook} />
            </Sequence>
          )}
          {timeline.captions?.style !== 'none' && words.length > 0 && (
            <Captions words={words} {...(timeline.captions ?? {})} />
          )}
          {timeline.audio && <Audio src={staticFile(timeline.audio)} />}
          {(timeline.sfx ?? []).map((x, i) => (
            <Sequence key={i} from={Math.round(x.t * fps)} name={`sfx ${x.src}`}>
              <Audio src={staticFile(x.src)} volume={x.volume ?? 0.5} />
            </Sequence>
          ))}
          {timeline.showSafeZone && <SafeZone />}
        </AbsoluteFill>
      </VideoContext.Provider>
    </BrandContext.Provider>
  );
};
