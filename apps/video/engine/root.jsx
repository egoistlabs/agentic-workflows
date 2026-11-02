// Remotion entry for every video. The bundler aliases `@scenes` to the video's
// 05-build/scenes.jsx; timeline, words and brand arrive as input props.
import { Composition, registerRoot } from 'remotion';
import { MainVideo } from './video.jsx';

const Root = () => (
  <Composition
    id="Video"
    component={MainVideo}
    defaultProps={{ timeline: { width: 1080, height: 1920, fps: 30, duration: 1, scenes: [] }, words: [], brand: {}, face: null }}
    calculateMetadata={({ props }) => {
      const { width, height, fps, duration } = props.timeline;
      return { width, height, fps, durationInFrames: Math.ceil(duration * fps) };
    }}
  />
);

registerRoot(Root);
