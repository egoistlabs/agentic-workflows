import { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const BrandContext = createContext({});
export const SceneContext = createContext({ start: 0, end: 0, props: {} });

/** Brand tokens from the video's brand pack (bg, fg, accent, muted, fontFile…). */
export const useBrand = () => useContext(BrandContext);

/** CSS font-family for the accent serif (X6): the bundled file, the named font, or the sans in italic. */
export const accentFont = (brand) =>
  brand.fontAccentFile ? 'AccentFont, serif' : brand.fontAccent ? `"${brand.fontAccent}", serif` : 'inherit';

/** Absolute frame, the timeline's footage (with its layout) and the face track (assets/face.json). */
export const VideoContext = createContext({ frame: 0, footage: null, face: null, record: false });
export const useVideo = () => useContext(VideoContext);

/** Seconds since this scene started, and the absolute video time. */
export const useTime = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, end } = useContext(SceneContext);
  const t = f / fps;
  return { t, abs: start + t, length: end - start };
};
