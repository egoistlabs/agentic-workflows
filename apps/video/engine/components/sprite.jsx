// A frame from a sprite sheet (mascot poses etc). `sheet` is the sheet JSON
// ({image, width, height, frames:[{name,x,y,width,height}]}) imported or passed in.
import { Img, staticFile } from 'remotion';

export const Sprite = ({ sheet, frame, size = 600, dir = '', style }) => {
  const f = sheet.frames.find((x) => x.name === frame) ?? sheet.frames[0];
  const k = size / f.width;
  return (
    <div style={{ width: size, height: f.height * k, overflow: 'hidden', position: 'relative', ...style }}>
      <Img src={staticFile(dir + sheet.image)} style={{ position: 'absolute', width: sheet.width * k, height: sheet.height * k, left: -f.x * k, top: -f.y * k, maxWidth: 'none' }} />
    </div>
  );
};
